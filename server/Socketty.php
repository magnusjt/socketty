<?php
namespace Socketty;

use \Psr\Log\LoggerInterface;
use \Ratchet\ConnectionInterface;
use \Ratchet\MessageComponentInterface;
use \React\EventLoop\LoopInterface;

class Socketty implements MessageComponentInterface{
    /** @var LoggerInterface */
    protected $logger;

    /** @var LoopInterface  */
    protected $loop;

    /** @var  ClientFactory */
    protected $clientFactory;

    /** @var AuthenticatorInterface  */
    protected $authenticator;

    /** @var \SplObjectStorage  */
    protected $clients;

    public function __construct(LoggerInterface $logger,
                                LoopInterface $loop,
                                ClientFactory $clientFactory,
                                AuthenticatorInterface $authenticator = null){
        $this->logger = $logger;
        $this->loop = $loop;
        $this->clientFactory = $clientFactory;
        $this->authenticator = $authenticator;
        $this->clients = new \SplObjectStorage();
    }

    public function getNumberOfClients(){
        return $this->clients->count();
    }

    public function getNumberOfTerminals(){
        $n = 0;
        foreach($this->clients as $client){
            $n += $client->getNumberOfTerminals();
        }

        return $n;
    }

    public function logStatistics(){
        $this->logger->info('Current number of clients: ' . $this->getNumberOfClients() . ', with a total of ' . $this->getNumberOfTerminals() . ' terminals');
    }

    /**
     * @param ConnectionInterface $conn
     * @return bool|Client
     */
    public function getClientFromConnection(ConnectionInterface $conn){
        /** @var Client $client */
        foreach($this->clients as $client){
            if($client->getConn() == $conn){
                return $client;
            }
        }

        return false;
    }

    function onOpen(ConnectionInterface $conn){
        $this->logger->info('Connection established');

        if($this->authenticator === null
           or $this->authenticator->check($conn->Session)
        ){
            $this->logger->info('Authentication successful');
            $this->clients->attach($this->clientFactory->getClient($conn));
            $conn->send('auth_success');
        }else{
            $this->logger->info('Authentication failed');
            $conn->send('auth_failure');
            $conn->close();
        }

        $this->logStatistics();
    }

    function onClose(ConnectionInterface $conn){
        $this->logger->info('Connection closed. Closing client now.');

        $client = $this->getClientFromConnection($conn);
        if($client !== false){
            $this->clients->detach($client);
            $client->close();
        }

        $this->logStatistics();
    }

    function onError(ConnectionInterface $conn, \Exception $e){
        $this->logger->error('Connection error. Closing the connection.', array('exception' => $e));
        $conn->close();
        $this->logStatistics();
    }

    function onMessage(ConnectionInterface $from, $msg){
        $this->logger->debug('Incoming msg: ' . $msg);

        $obj = json_decode($msg, true);
        $client = $this->getClientFromConnection($from);

        if($client === false){
            $this->logger->error('Message could not be handled because client was not found. Closing the connection.');
            $from->close();
            return;
        }

        try{
            $client->handleMessage($obj['id'], $obj['type'], $obj['value']);
        }catch(\Exception $e){
            $this->logger->error('Error handling message from client. Closing the connection now.', array('exception' => $e));
            $from->close();
        }
    }
}
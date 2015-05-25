<?php
namespace Socketty;

use \Psr\Log\LoggerInterface;
use \Ratchet\ConnectionInterface;
use \Ratchet\MessageComponentInterface;

class Socketty implements MessageComponentInterface{
    private $logger;
    private $loop;
    private $clients;

    public function __construct(LoggerInterface $logger){
        $this->logger = $logger;
        $this->clients = new \SplObjectStorage();
    }

    /**
     * @param $loop \React\EventLoop\LoopInterface
     */
    public function setLoop($loop){
        $this->loop = $loop;
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
        foreach($this->clients as $client){
            if($client->getConn() == $conn){
                return $client;
            }
        }

        return false;
    }

    function onOpen(ConnectionInterface $conn){
        $this->logger->info('Connection established');

        $this->clients->attach(new Client($this->logger, $conn, $this->loop));

        $this->logStatistics();
    }

    function onClose(ConnectionInterface $conn){
        $this->logger->info('Connection closed. Closing client now.');

        $client = $this->getClientFromConnection($conn);
        if($client === false){
            $this->logger->error('Could not properly close client because client was not found');
        }else{
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
            $client->message($obj['t'], $obj);
        }catch(\Exception $e){
            $this->logger->error('Error handling message from client. Closing the connection now.', array('exception' => $e));
            $from->close();
        }
    }
}
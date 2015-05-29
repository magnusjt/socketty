<?php
namespace Socketty;

use Psr\Log\LoggerInterface;
use Ratchet\ConnectionInterface;
use React\EventLoop\LoopInterface;
use Symfony\Component\HttpFoundation\Session\Session;

class Client{
    const CREATE_TERMINAL = 1; // From client
    const CREATE_TERMINAL_SUCCESS = 2; // From server
    const CREATE_TERMINAL_FAILURE = 3; // From server

    const READ_TERMINAL_DATA = 4; // From server
    const READ_TERMINAL_DATA_FAILURE = 5; // From server

    const WRITE_TERMINAL_DATA = 6; // From client
    const WRITE_TERMINAL_DATA_FAILURE = 7; // From server

    const CLOSE_TERMINAL = 8; // From client
    const CLOSE_TERMINAL_SUCCESS = 9; // From server
    const CLOSE_TERMINAL_FAILURE = 10; // From server

    const MESSAGE_UNKNOWN = 11; // From server

    const AUTHENTICATE = 12; // From client
    const AUTHENTICATION_SUCCESS = 13; // From server
    const AUTHENTICATION_FAILURE = 14; // From server

    const STATE_CONNECTED = 2;
    const STATE_AUTHENTICATED = 3;

    /** @var  LoggerInterface */
    private $logger;

    /** @var ConnectionInterface */
    private $conn;

    /** @var  LoopInterface */
    private $loop;

    /** @var  Session */
    private $session;

    /** @var Terminal[] */
    private $terminals;

    /** @var  AuthenticatorInterface */
    private $authenticator;

    /** @var AuthorizerInterface  */
    private $authorizer;

    /** @var int */
    private $state = self::STATE_CONNECTED;

    public function __construct(LoggerInterface $logger,
                                ConnectionInterface $conn,
                                LoopInterface $loop,
                                AuthenticatorInterface $authenticator = null,
                                AuthorizerInterface $authorizer = null){
        $this->logger = $logger;
        $this->conn = $conn;
        $this->loop = $loop;
        $this->authenticator = $authenticator;
        $this->authorizer = $authorizer;
        $this->terminals = new \SplObjectStorage();

        if(isset($conn->Session)){
            $this->session = $conn->Session;
        }
    }

    public function getConn(){
        return $this->conn;
    }

    public function getNumberOfTerminals(){
        return $this->terminals->count();
    }

    /**
     * Close the client, tear down terminals
     */
    public function close(){
        // NB: Detaching while inside the loop must be done after calling next, otherwise the iteration stops

        $this->terminals->rewind();
        while($this->terminals->valid()){
            $terminal = $this->terminals->current();
            $this->terminals->next();
            $this->closeTerminal($terminal);
        }
    }

    /**
     * Handles incoming socket messages
     *
     * @param $type
     * @param $obj
     */
    public function handleMessage($type, $obj){
        switch($this->state){
            case self::STATE_CONNECTED:
                $this->handleMessageStateConnected($type, $obj);
                break;
            case self::STATE_AUTHENTICATED;
                $this->handleMessageStateAuthenticated($type, $obj);
                break;
            default:
                break;
        }
    }

    private function handleMessageStateConnected($type, $obj){
        switch($type){
            case self::AUTHENTICATE:
                $this->performAuthentication();
                break;
            default:
                $this->send(self::MESSAGE_UNKNOWN, $obj);
                break;
        }
    }

    private function handleMessageStateAuthenticated($type, $obj){
        switch($type){
            case self::CREATE_TERMINAL:
                $this->createTerminal($obj['id'], $obj['ip'], $obj['username'], $obj['password']);
                break;
            case self::WRITE_TERMINAL_DATA:
                $this->writeTerminalData($obj['id'], $obj['d']);
                break;
            case self::CLOSE_TERMINAL:
                $this->closeTerminalById($obj['id']);
                break;
            default:
                $this->send(self::MESSAGE_UNKNOWN, $obj);
                break;
        }
    }

    /**
     * Tear down a terminal
     *
     * @param Terminal $terminal
     */
    private function closeTerminal(Terminal $terminal){
        $this->logger->info('Closing terminal to IP ' . $terminal->getIp());
        $id = $terminal->getId();

        $this->terminals->detach($terminal);

        $this->loop->removeReadStream($terminal->getStream());

        $terminal->close();

        $this->send(self::CLOSE_TERMINAL_SUCCESS, array(
            'id' => $id
        ));
    }

    private function performAuthentication(){
        if($this->authenticator === null
            or $this->authenticator->check($this->session)
        ){
            $this->logger->info('Authentication successful');
            $this->state = self::STATE_AUTHENTICATED;
            $this->send(self::AUTHENTICATION_SUCCESS);
            return;
        }

        $this->logger->info('Authentication failed, closing connection.');
        $this->send(self::AUTHENTICATION_FAILURE);
        $this->conn->close();
    }

    /**
     * Create a new terminal and attach it to the loop
     *
     * @param $id
     * @param $ip
     * @param $username
     * @param $password
     */
    private function createTerminal($id, $ip, $username, $password){
        $this->logger->info('Creating new terminal to IP ' . $ip);

        if($this->authorizer !== null and !$this->authorizer->check($this->session, $ip, $username)){
            $this->send(self::CREATE_TERMINAL_FAILURE, array(
                'id' => $id,
                'msg' => 'Not authorized'
            ));

            return;
        }

        if(false !== $this->getTerminalById($id)){
            $this->logger->error('Terminal could not be created because the requested id already exists');
            $this->send(self::CREATE_TERMINAL_FAILURE, array(
                'id' => $id,
                'msg' => 'Could not connect because terminal id already exists'
            ));

            return;
        }

        try{
            $terminal = new Terminal($ip, $username, $password, $id);
        }catch(\Exception $e){
            $this->logger->error('Terminal could not be created', array('exception' => $e));
            $this->send(self::CREATE_TERMINAL_FAILURE, array(
                'id' => $id,
                'msg' => 'Could not connect, ' . $e->getMessage()
            ));

            return;
        }

        $this->terminals->attach($terminal);

        $this->send(self::CREATE_TERMINAL_SUCCESS, array(
            'id' => $id
        ));

        $this->loop->addReadStream($terminal->getStream(), function() use ($terminal){
            $this->sendTerminalUpdate($terminal);
        });

        // Send initial terminal data
        $this->sendTerminalUpdate($terminal);
    }

    /**
     * Write data to the terminal with a given id
     *
     * @param $id
     * @param $data
     */
    private function writeTerminalData($id, $data){
        $terminal = $this->getTerminalById($id);

        if($terminal === false){
            $this->send(self::WRITE_TERMINAL_DATA_FAILURE, array(
                'id' => $id,
                'msg' => 'Unknown terminal'
            ));
            return;
        }

        try{
            $terminal->write($data);
        }catch(\Exception $e){
            $this->send(self::WRITE_TERMINAL_DATA_FAILURE, array(
                'id' => $id,
                'msg' => $e->getMessage()
            ));
        }
    }

    /**
     * Close the terminal with a given id
     *
     * @param $id
     */
    private function closeTerminalById($id){
        $terminal = $this->getTerminalById($id);
        if($terminal !== false){
            $this->closeTerminal($terminal);
        }else{
            $this->send(self::CLOSE_TERMINAL_FAILURE, array(
                'id' => $id,
                'msg' => 'Unknown terminal'
            ));
        }
    }

    /**
     * Read data from the terminal and send it to the client
     *
     * @param Terminal $terminal
     */
    private function sendTerminalUpdate(Terminal $terminal){
        $id = $terminal->getId();

        try{
            $data = $terminal->read();
        }catch(\Exception $e){
            $this->logger->error('Terminal read failure, closing terminal', array('exception' => $e));

            $this->send(self::READ_TERMINAL_DATA_FAILURE, array(
                'id' => $id,
                'msg' => $e->getMessage()
            ));

            $this->closeTerminal($terminal);
            return;
        }

        $this->send(self::READ_TERMINAL_DATA, array(
            'id' => $id,
            'd' => $data
        ));
    }

    /**
     * Send a general message to the client
     *
     * @param $type
     * @param $obj
     */
    private function send($type, $obj = array()){
        $message = array(
            'type' => $type,
            'value' => $obj
        );

        $this->conn->send(json_encode($message));
    }

    /**
     * Get the terminal with a given id
     *
     * @param $id
     * @return bool|Terminal
     */
    private function getTerminalById($id){
        foreach($this->terminals as $terminal){
            if($terminal->getId() == $id){
                return $terminal;
            }
        }

        return false;
    }
}
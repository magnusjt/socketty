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

    /** @var  TerminalFactory */
    private $terminalFactory;

    /** @var AuthorizerInterface  */
    private $authorizer;

    public function __construct(LoggerInterface $logger,
                                ConnectionInterface $conn,
                                LoopInterface $loop,
                                TerminalFactory $terminalFactory,
                                AuthorizerInterface $authorizer = null){
        $this->logger = $logger;
        $this->conn = $conn;
        $this->loop = $loop;
        $this->terminalFactory = $terminalFactory;
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
     * @param $id    int Terminal id
     * @param $type  int Type of message
     * @param $value mixed
     */
    public function handleMessage($id, $type, $value){
        switch($type){
            case self::CREATE_TERMINAL:
                $this->createTerminal($id, $value['cmd']);
                break;
            case self::WRITE_TERMINAL_DATA:
                $this->writeTerminalData($id, $value['d']);
                break;
            case self::CLOSE_TERMINAL:
                $this->logger->info('Received close request');
                $this->closeTerminalById($id);
                break;
            default:
                $this->send(self::MESSAGE_UNKNOWN, $value);
                break;
        }
    }

    /**
     * Tear down a terminal
     *
     * @param Terminal $terminal
     */
    private function closeTerminal(Terminal $terminal){
        $this->logger->info('Closing terminal');
        $id = $terminal->getId();

        $this->terminals->detach($terminal);

        $terminal->close();

        $this->send($id, self::CLOSE_TERMINAL_SUCCESS);
    }

    /**
     * Create a new terminal and attach it to the loop
     *
     * @param $id
     * @param $cmdString
     */
    private function createTerminal($id, $cmdString){
        $this->logger->info('Creating new terminal with command ' . $cmdString);

        if(strlen($cmdString) == 0){
            $this->logger->error('Terminal could not be created because command was not provided');
            $this->send($id, self::CREATE_TERMINAL_FAILURE, array('msg' => 'No command provided'));
            return;
        }

        $parts = explode(' ', $cmdString);
        $cmd = array_shift($parts);
        $args = implode(' ', $parts);

        if($this->authorizer !== null){
            $authorizeResult = $this->authorizer->check($this->session, $cmd, $args);
            if($authorizeResult !== true){
                $msg = 'Not authorized for this command and arguments';
                if(is_string($authorizeResult)){
                    $msg = $authorizeResult;
                }

                $this->logger->error('Terminal could not be created because: ' . $msg);
                $this->send($id, self::CREATE_TERMINAL_FAILURE, array('msg' => $msg));
                return;
            }
        }

        if(false !== $this->getTerminalById($id)){
            $this->logger->error('Could not create terminal because terminal id already exists');
            $this->send($id, self::CREATE_TERMINAL_FAILURE, array('msg' => 'Could not create terminal because terminal id already exists'));
            return;
        }

        $onData = function($data) use($id){
            $this->sendTerminalUpdate($id, $data);
        };
        $onExit = function($exitCode, $termSignal) use($id){
            $this->logger->info('Terminal terminated ('.$exitCode .':'.$termSignal.') closing...');
            $this->closeTerminalById($id);
        };

        try{
            $terminal = $this->terminalFactory->getTerminal($id, $cmd, $args, $onData, $onExit);
        }catch(\Exception $e){
            $this->logger->error('Terminal could not be created', array('exception' => $e));
            $this->send($id, self::CREATE_TERMINAL_FAILURE, array('msg' => 'Terminal not created: ' . $e->getMessage()));
            return;
        }

        $this->terminals->attach($terminal);

        $this->send($id, self::CREATE_TERMINAL_SUCCESS);
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
            $this->send($id, self::WRITE_TERMINAL_DATA_FAILURE, array('msg' => 'Unknown terminal'));
            return;
        }

        try{
            $terminal->write($data);
        }catch(\Exception $e){
            $this->send($id, self::WRITE_TERMINAL_DATA_FAILURE, array('msg' => $e->getMessage()));
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
            $this->send($id, self::CLOSE_TERMINAL_FAILURE, array('msg' => 'Unknown terminal'));
        }
    }

    /**
     * Read data from the terminal and send it to the client
     *
     * @param $id int
     * @param $data string
     */
    private function sendTerminalUpdate($id, $data){
        $this->send($id, self::READ_TERMINAL_DATA, array('d' => $data));
    }

    /**
     * Send a general message to the client
     *
     * @param $id     int Terminal id
     * @param $type   int Message type
     * @param $value  mixed
     */
    private function send($id, $type, $value = array()){
        $message = array(
            'id' => $id,
            'type' => $type,
            'value' => $value
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
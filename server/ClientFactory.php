<?php namespace Socketty;

use Psr\Log\LoggerInterface;
use Ratchet\ConnectionInterface;
use React\EventLoop\LoopInterface;

class ClientFactory{
    /** @var  TerminalFactory */
    protected $terminalFactory;

    /** @var  LoggerInterface */
    protected $logger;

    /** @var  LoopInterface */
    protected $loop;

    /** @var  AuthorizerInterface */
    protected $authorizer;

    public function __construct(LoopInterface $loop,
                                LoggerInterface $logger,
                                TerminalFactory $terminalFactory,
                                AuthorizerInterface $authorizer = null){
        $this->loop = $loop;
        $this->logger = $logger;
        $this->terminalFactory = $terminalFactory;
        $this->authorizer = $authorizer;
    }

    public function getClient(ConnectionInterface $conn){
        return new Client($this->logger, $conn, $this->loop, $this->terminalFactory, $this->authorizer);
    }
}
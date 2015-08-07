<?php namespace Socketty;

use React\EventLoop\LoopInterface;

class TerminalFactory{
    /** @var LoopInterface  */
    protected $loop;

    /** @var  SpawnerInterface */
    protected $spawner;

    public function __construct(LoopInterface $loop, SpawnerInterface $spawner){
        $this->loop = $loop;
        $this->spawner = $spawner;
    }

    public function getTerminal($id, $cmd, $args, $onData, $onExit){
        return new Terminal($this->loop, $this->spawner, $id, $cmd, $args, $onData, $onExit);
    }
}
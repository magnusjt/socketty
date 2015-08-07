<?php
namespace Socketty;

use React\ChildProcess\Process;
use React\EventLoop\LoopInterface;
use React\Stream\Stream;

class Terminal{
    /** @var  int */
    protected $id;

    /** @var LoopInterface */
    protected $loop;

    /** @var  Process */
    protected $process;

    /** @var  Stream */
    protected $in;

    /** @var  Stream */
    protected $out;

    /** @var  Stream */
    protected $err;

    public function __construct(LoopInterface $loop, SpawnerInterface $spawner, $id, $cmd, $args, $onData, $onExit){
        $this->id = $id;
        $this->loop = $loop;

        $this->process = new Process($spawner->spawn($cmd, $args));
        $this->process->on('exit', function($exitCode, $termSignal) use($onExit) {
            call_user_func($onExit, $exitCode, $termSignal);
        });

        $this->process->start($loop);
        $this->out = $this->process->stdout;
        $this->in = $this->process->stdin;
        $this->err = $this->process->stderr;

        $this->out->on('data', function($data) use($onData){
            call_user_func($onData, $data);
        });
        $this->err->on('data', function($data) use($onData){
            call_user_func($onData, $data);
        });
    }

    public function __destruct(){
        $this->close();
    }

    public function close(){
        if($this->out !== null){
            $this->out->removeAllListeners();
        }
        if($this->in !== null){
            $this->in->removeAllListeners();
        }
        if($this->err !== null){
            $this->err->removeAllListeners();
        }

        $this->process->removeAllListeners();
        if($this->process->isRunning()){
            $this->process->terminate();
        }
    }

    public function write($data){
        if(!$this->in->isWritable()){
            throw new \Exception('Stream not writable');
        }

        $this->in->write($data);
    }

    public function getId(){
        return $this->id;
    }
}
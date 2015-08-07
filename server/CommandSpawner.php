<?php namespace Socketty;

class CommandSpawner implements SpawnerInterface{
    protected $enabled = [];

    public function __construct($enabled){
        $this->enabled = $enabled;
    }

    public function spawn($cmd, $args){
        if(!in_array($cmd, $this->enabled)){
            throw new \Exception('Command not available');
        }

        $argsEscaped = escapeshellarg($args);
        $script = 'python '.__DIR__.'/../spawner.py';
        return $script.' '.$cmd.' '.$argsEscaped;
    }


}
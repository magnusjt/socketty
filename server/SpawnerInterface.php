<?php namespace Socketty;

interface SpawnerInterface{
    /**
     * This function should return a string (a command)
     * which will open a process to be run.
     *
     * @param $cmd string
     * @param $args string
     *
     * @return string|bool
     */
    public function spawn($cmd, $args);
}
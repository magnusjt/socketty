<?php
namespace Socketty;

require('Net/SSH2.php');

class Terminal{
    private $id;
    private $ip;

    private $ssh;

    public function __construct($ip, $username, $password, $id){
        $this->id = $id;
        $this->ip = $ip;
        $this->ssh = new \Net_SSH2($ip);

        if(!$this->ssh->login($username, $password)){
            throw new \Exception('Could not login to host');
        }

        // Need a timeout because the read function blocks otherwise
        $this->ssh->setTimeout(0.1);
    }

    public function close(){
        // phpseclib disconnects in the destructor,
        // but we don't want to wait for garbage collection as that can take some time
        $this->ssh->disconnect();
        unset($this->ssh);
    }

    public function getId(){
        return $this->id;
    }

    public function getIp(){
        return $this->ip;
    }

    public function getStream(){
        return $this->ssh->fsock;
    }

    public function read(){
        return $this->ssh->read();
    }

    public function write($data){
        $this->ssh->write($data);
    }
}
<?php
namespace Socketty;

use phpseclib\Net\SSH2;

class Terminal{
    private $id;
    private $ip;

    private $ssh;

    public function __construct($ip, $username, $password, $id){
        $this->id = $id;
        $this->ip = $ip;
        $this->ssh = new SSH2($ip);
        $this->ssh->setTimeout(5);

        if(!$this->ssh->login($username, $password)){
            throw new \Exception('Could not login to host');
        }
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
        return $this->readWithoutLocking();
    }

    public function write($data){
        $this->ssh->write($data);
    }

    /**
     * NB: This is a modified version of SSH2::read without the locking (the expect functionality)
     *     Here we just want to read whatever we can and return.
     *
     *
     * @return bool|string
     * @throws \Exception
     */
    private function readWithoutLocking(){
        $this->ssh->curTimeout = $this->ssh->timeout;
        $this->ssh->is_timeout = false;

        if (!($this->ssh->bitmap & SSH2::MASK_LOGIN)) {
            throw new \Exception('Read not allowed before login');
        }

        if (!($this->ssh->bitmap & SSH2::MASK_SHELL) && !$this->ssh->_initShell()) {
            throw new \Exception('Unable to initiate an interactive shell session');
        }

        $channel = $this->ssh->_get_interactive_channel();
        $response = $this->ssh->_get_channel_packet($channel);
        return $response;
    }
}
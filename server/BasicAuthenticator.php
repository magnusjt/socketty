<?php
namespace Socketty;

use Symfony\Component\HttpFoundation\Session\SessionInterface;

class BasicAuthenticator implements AuthenticatorInterface{
    private $sessionKey;

    /**
     * @param $sessionKey string Checks if the session has this key set
     */
    public function __construct($sessionKey = 'username'){
        $this->sessionKey = $sessionKey;
    }

    public function check(SessionInterface $session = null){
        if($session === null){
            return false;
        }

        if($session->has($this->sessionKey)){
            return true;
        }

        return false;
    }
}
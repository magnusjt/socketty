<?php
namespace Socketty;

use \Symfony\Component\HttpFoundation\Session\SessionInterface;

class BasicAuthorizer implements AuthorizerInterface{
    private $allowedIps;

    public function __construct($allowedIps = array()){
        $this->allowedIps = $allowedIps;
    }

    public function check(SessionInterface $session = NULL, $ip, $username){
        if(in_array($ip, $this->allowedIps)){
            return true;
        }

        return false;
    }
}
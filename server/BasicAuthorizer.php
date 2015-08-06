<?php
namespace Socketty;

use \Symfony\Component\HttpFoundation\Session\SessionInterface;

class BasicAuthorizer implements AuthorizerInterface{
    public function check(SessionInterface $session = NULL, $cmd, $args){
        if($cmd == 'ssh'){
            return $this->validateSsh($args);
        }else if($cmd == 'top'){
            return $this->validateTop($args);
        }else if($cmd == 'ping'){
            return $this->validatePing($args);
        }

        return 'You are not authorized for this command';
    }

        protected function validateSsh($args){
        if(1 !== preg_match('/^\w+\@[\w\.:]+$/', $args)){
            return 'Args must be of the form user@host';
        }

        return true;
    }

    protected function validateTop($args){
        if(strlen($args) > 0){
            return 'Top cannot receive any arguments';
        }

        return true;
    }

    protected function validatePing($args){
        if(1 !== preg_match('/^[\w\.:]+$/', $args)){
            return 'Args must be of the form [host | ip-address]';
        }

        return true;
    }
}
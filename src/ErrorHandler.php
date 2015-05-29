<?php
namespace Socketty;

class ErrorHandler{

    static public function setErrorHandler(){
        // Need an error handler because phpseclib uses old-style errors, but socketty uses exceptions
        $handler = function ($errno, $errstr, $errfile, $errline){
            if($errno == E_USER_WARNING){
                echo 'Warning: ' . $errstr . "\n";
                return;
            }

            throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
        };

        set_error_handler($handler);
    }
}
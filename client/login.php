<?php
/*
 * This is just a dummy page pretending to log a user in.
 * The idea is to test sessions on the server
 */
require(__DIR__ . '/../vendor/autoload.php');

use \Symfony\Component\HttpFoundation\Session\Session;
use \Symfony\Component\HttpFoundation\Session\Storage\Handler\MemcachedSessionHandler;
use \Symfony\Component\HttpFoundation\Session\Storage\NativeSessionStorage;

try{
    $memcached = new Memcached();
    $memcached->addServer('localhost', 11211);

    $handler = new MemcachedSessionHandler($memcached);
    $storage = new NativeSessionStorage(array(), $handler);
    $session = new Session($storage);
    $session->setName('CUSTOM_NAME');
    $session->start();

    if($session->has('username')){
        echo "Already logged in";
    }else{
        $session->set('username', 'Mister hoba loba loba');
        echo "Logged in!";
    }
}catch(Exception $e){
    echo $e->getMessage();
}
<?php
require __DIR__ . '/vendor/autoload.php';
set_include_path(get_include_path() . PATH_SEPARATOR . __DIR__ . '/lib/phpseclib0.3.10');
date_default_timezone_set('Europe/Oslo');

use \Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use \Socketty\Socketty;

// Need an error handler because phpseclib uses old-style errors, but socketty uses exceptions
function error_handler($errno, $errstr, $errfile, $errline){
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
}
set_error_handler('error_handler');

$logger = new Monolog\Logger('socketty', array(new \Monolog\Handler\StreamHandler('php://stdout', \Psr\Log\LogLevel::INFO)));
$socketty = new Socketty($logger);

$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            $socketty
        )
    ),
    8080
);

$socketty->setLoop($server->loop);

$server->run();
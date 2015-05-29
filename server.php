<?php
require __DIR__ . '/vendor/autoload.php';

use \Ratchet\Session\SessionProvider;
use \React\EventLoop\Factory as LoopFactory;
use Socketty\BasicAuthenticator;
use Socketty\BasicAuthorizer;
use \Socketty\Socketty;
use \Socketty\ErrorHandler;
use \Symfony\Component\HttpFoundation\Session\Storage\Handler\MemcachedSessionHandler;

ErrorHandler::setErrorHandler();

set_include_path(get_include_path() . PATH_SEPARATOR . __DIR__ . '/lib/phpseclib0.3.10');
date_default_timezone_set('Europe/Oslo');

$loop = LoopFactory::create();
$app = new \Ratchet\App('localhost', 8080, '127.0.0.1', $loop);

$logger = new Monolog\Logger('socketty', array(new \Monolog\Handler\StreamHandler('php://stdout', \Psr\Log\LogLevel::INFO)));

$authenticator = new BasicAuthenticator('username');
$authorizer = new BasicAuthorizer(array('127.0.0.1'));
$socketty = new Socketty($logger, $loop, $authenticator, $authorizer);

$memcached = new Memcached();
$memcached->addServer('localhost', 11211);
$handler = new MemcachedSessionHandler($memcached);
$sessionProvider = new SessionProvider($socketty, $handler, array('name' => 'CUSTOM_NAME'));

$app->route('', $sessionProvider);
$app->run();
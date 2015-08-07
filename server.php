<?php
require __DIR__ . '/vendor/autoload.php';

use Ratchet\Session\SessionProvider;
use React\EventLoop\Factory as LoopFactory;
use Socketty\BasicAuthenticator;
use Socketty\BasicAuthorizer;
use Socketty\ClientFactory;
use Socketty\CommandSpawner;
use Socketty\Socketty;
use Socketty\TerminalFactory;
use Symfony\Component\HttpFoundation\Session\Storage\Handler\MemcachedSessionHandler;

date_default_timezone_set('Europe/Oslo');

$loop = LoopFactory::create();
$app = new \Ratchet\App('localhost', 8080, '127.0.0.1', $loop);

$handler = new \Monolog\Handler\StreamHandler('php://stdout', \Psr\Log\LogLevel::INFO);
$processor = new \Monolog\Processor\MemoryUsageProcessor();
$logger = new Monolog\Logger('socketty', array($handler), array($processor));

$authenticator = new BasicAuthenticator('username');
$authorizer = new BasicAuthorizer();
$enabledCommands = [
    'ssh',
    'top',
    'ping'
];
$spawner = new CommandSpawner($enabledCommands);
$terminalFactory = new TerminalFactory($loop, $spawner);
$clientFactory = new ClientFactory($loop, $logger, $terminalFactory, $authorizer);
$socketty = new Socketty($logger, $loop, $clientFactory, $authenticator);

$memcached = new Memcached();
$memcached->addServer('localhost', 11211);
$handler = new MemcachedSessionHandler($memcached);
$sessionProvider = new SessionProvider($socketty, $handler, array('name' => 'CUSTOM_NAME'));

$app->route('', $sessionProvider);
$app->run();
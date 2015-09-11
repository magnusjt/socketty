# socketty
Interactive terminals over websockets with a php backend.
It can for instance be used to create interactive SSH sessions, but should work
with any command.
At the same time, an existing php backend can be used to perform authorization and authentication.

Uses the following tech:

* ratchet - Websockets with PHP
* reactphp - Async IO in PHP through an event loop
* term.js - Terminal emulation in the browser
* reactjs - For the rest of the UI
* python's pty module - For emulating a pty which php can interact with using normal pipes

![alt tag](https://raw.github.com/magnusjt/socketty/master/ex.png)

### Usage

The project consists of a PHP backend which manages the client connections, and a frontend which
emulates the terminal. In order to run the backend server, create a composer dependency on this project,
and follow the example in `./server.php`:

````
composer require magnusjt/socketty
````

Here you can customize:

* Authentication - Implement the AuthenticatorInterface. If you want to reuse sessions from an existing site,
  you will need to do this through memcached
* Authorization - Same as Authentication, but in this case you may also authorize the command and command arguments.
* Port to use for websockets
* Allowed hosts
* Logging - The project uses the psr LoggerInterface, so anything goes (Monolog is a nice option)
* Spawner - Generates a command string to be executed. Commands can be enabled and disabled here.

Backend example:
See `./server.php`

Frontend:
Install by adding the following to npm dependencies:
`"socketty": "git://github.com/magnusjt/socketty.git#master"`

Frontend example (needs to be compiled with browserify and babelify):
````
var Socketty = require('socketty');
var domNodeId = 'app'; // ID of the dom node to open the app in
var wssUrl = 'wss://localhost:5678'; // Websocket URL

// Create some presets
var opts = [
    {
        name: 'SSH',
        open: true,
        list: [
            {cmd: 'ssh vagrant@127.0.0.1', 'name': 'Vagrant SSH'},
        ]
    },
    {
        name: 'Ping',
        open: false,
        list: [
            {cmd: 'ping 127.0.0.1', 'name': 'Ping localhost'},
        ]
    }
];

Socketty.start(domNodeId, wssUrl, opts);
````

### Development

* Install frontend dependencies with `npm install`.
* Install backend dependencies with `composer install`
* Copy and rename a Vagrantfile and vagrant_bootstrap.sh file
* Start virtual server with `vagrant up`
* Start websocket server with `php server.php`
* Open browser and go to https://localhost:5678/login.php to pretend to login
* Open browser and go to https://localhost:5678 and spawn some terminals into the virtual server
* Build frontend stuff with `gulp build` and `gulp watchify`
* NB: apache and haproxy may need to be started manually after a reboot:

 ````
 service httpd start
/usr/local/sbin/haproxy -f /vagrant/haproxy.cfg -p /var/run/haproxy.pid -D
 ````

### About SSL
In order to have secure web sockets, the vagrant install includes haproxy which terminates all ssl requests.

### How it works
First of all, reactphp is used together with an event loop to acheive async calls with PHP.
A sub component of reactphp called child-processes uses PHP's proc_open to connect to
a child process and its pipes. For programs that require a tty (such as ssh and its interactive password prompt),
we would really like to use PHP's pty pipes, but these are sadly not available on most systems.
To get around this, all comands are opened through a python script, which uses the pty module
to simulate a pty.
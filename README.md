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

### Usage

The project consists of a PHP backend which manages the client connections, and a frontend which
emulates the terminal. In order to run the backend server, create a composer dependency on this project
(not available through packagist, use github as a composer repository), and follow the example layed out in ./server.php.
Here you can customize:

* Authentication - Implement the AuthenticatorInterface. If you want to reuse sessions from an existing site,
  you will need to do this through memcached
* Authorization - Same as Authentication, but in this case you may also authorize the command and command arguments.
* Port to use for websockets
* Allowed hosts
* Logging - The project uses the psr LoggerInterface, so anything goes (Monolog is a nice option)
* Spawner - Generates a command string to be executed. Commands can be enabled and disabled here.

As for the frontend, you need to use the reactjs component in  `./client/js/Socketty.jsx` (see ./client/index.html for an example) In order to use this component,
you need to require it and compile with browserify or similar. See the gulpfile in this project, and the example app in `./client/app.js`

The SockettyTerminal component has some props you can specify:

* url:         - The URL which will be used for accessing the web socket server {type: String, value: 'wss://localhost:5678'}
* cmd:         - The default command to spawn (ex. ssh) {type: String, value: ''}
* args:        - The default arguments to the command {type: String, value: ''}
* cols:        - Number of columns in the terminal (term.js) {type: Number, value: 120}
* rows:        - Number of rows in the terminal (term.js) {type: Number, value: 30}
* screenKeys:  - (term.js) {type: Boolean, value: false}
* useStyle:    - (term.js) {type: Boolean, value: false}
* cursorBlink: - (term.js) {type: Boolean, value: true}
* debug:       - (term.js) {type: Boolean, value: false}
* record:      - Whether to record terminal data (used when downloading terminal content to file) {type: Boolean, value: true}

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
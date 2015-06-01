# socketty
Terminal over websockets using ratchet, phpseclib, and term.js

* Install frontend dependencies with `npm run deps`.
  This will install grunt, bower, and install node modules and bower components.
  Alternatively:
 * `npm install`
 * `bower install`
 * `grunt copy_bower`
* Install backend dependencies with `composer install`
* Copy and rename a Vagrantfile and vagrant_bootstrap.sh file
* Start virtual server with `vagrant up`
* Start websocket server with `/vagrant/server.php`
* Open browser and go to https://localhost:5678/login.php to pretend to login
* Open browser and go to https://localhost:5678 and spawn some terminals into the virtual server
* Vulcanize (concatenate) the web component elements with `grunt build`

### About SSL
In order to have secure web sockets, the vagrant install includes haproxy which terminates all ssl requests.

### TODO

* Send commands to multiple terminals at the same time
* Make it so that we only need the socketty-terminal element, and so that it handles its own web socket connection
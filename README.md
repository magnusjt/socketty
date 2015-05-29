# socketty
Terminal over websockets using ratchet and phpseclib

* Start virtual server with `vagrant up`
* Start websocket server with `/vagrant/server.php`
* Open browser and go to https://localhost:5678 and spawn some terminals into the virtual server

### About SSL
In order to have secure web sockets, the vagrant install includes haproxy which terminates all ssl requests.

### TODO

* Send commands to multiple terminals at the same time

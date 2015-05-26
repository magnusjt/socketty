# socketty
Terminal over websockets using ratchet and phpseclib

* Start virtual server with `vagrant up`
* Start websocket server with `/vagrant/server.php`
* Open browser and go to localhost:4567 and spawn some terminals into the virtual server

### TODO

* Insert commands into terminal from textarea
* Send commands to multiple terminals at the same time
* Authentication via existing session
* Authorization - is the ip address allowed for this user?
* SSL web sockets, proxy through apache on port 80?

# socketty
SSH Terminal over websockets using:

* ratchet - Websockets with PHP, and async IO
* phpseclib - Pure PHP SSH client
* term.js - Terminal emulation in the browser
* Polymer - Wrapping the browser client in a custom tag using web components, like this: <socketty-terminal></socketty-terminal>
  NB! Web components are not supported in all browser yet, so Polymer uses a polyfill. However, don't expect good results
  from this project using anything other than Chrome or Opera.

### Usage

The project consists of a PHP backend which manages the SSH client connections, and a frontend which
emulates the SSH terminal. In order to run the backend server, create a composer dependency on this project
(not available through packagist, use github as a composer repository), and follow the example layed out in ./server.php.
Here you can customize:

* Authentication - Implement the AuthenticatorInterface. If you want to reuse sessions from an existing site,
  you will need to do this through memcached
* Authorization - Same as Authentication, but in this case you may also authorize the SSH IP and username.
* Port to use for websockets
* Allowed hosts
* Logging - The project uses the psr LoggerInterface, so anything goes (Monolog is a nice option)

As for the frontend, you need to use the custom web component <socketty-terminal> (see ./client/index.html for an example) In order to use this component,
you also need:

* Polymer (webcomponents.js) - The web component library from google. The DOM type should be 'shady'
* jQuery - Dependency for bootstrap
* Bootstrap - For styling
* moment.js - For nice time formatting in javascript

The custom component is loaded with an HTML import:

````
<link rel="import" href="elements/elements.html">
````

Alternatively, you may use the "vulcanized" version which include the web component dependencies (found here: ./dist/elements.vulcanized.html)

The <socketty-terminal> tag has a bunch of attributes you can specify (just like normal HTML tag attributes):

* url:         - The URL which will be used for accessing the web socket server {type: String, value: 'wss://localhost:5678'}
* ip:          - The default SSH IP {type: String, value: ''}
* username:    - The default SSH username {type: String, value: ''}
* cols:        - Number of columns in the terminal (term.js) {type: Number, value: 120}
* rows:        - Number of rows in the terminal (term.js) {type: Number, value: 30}
* screenKeys:  - (term.js) {type: Boolean, value: true}
* useStyle:    - (term.js) {type: Boolean, value: false}
* cursorBlink: - (term.js) {type: Boolean, value: true}
* debug:       - (term.js) {type: Boolean, value: false}
* isRecording: - Whether to record terminal data (used when copying the terminal content) {type: Boolean, value: true}

### Development

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

### TODO:

* Currently phpseclib is blocking while doing SSH login. Need to circumvent this somehow.
* Possibly make the frontend stuff easier for others to use. Web components is definitely not the right choice
  for everybody.
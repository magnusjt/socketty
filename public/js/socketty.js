;(function(){
    const CREATE_TERMINAL = 1; // From client
    const CREATE_TERMINAL_SUCCESS = 2; // From server
    const CREATE_TERMINAL_FAILURE = 3; // From server

    const READ_TERMINAL_DATA = 4; // From server
    const READ_TERMINAL_DATA_FAILURE = 5; // From server

    const WRITE_TERMINAL_DATA = 6; // From client
    const WRITE_TERMINAL_DATA_FAILURE = 7; // From server

    const CLOSE_TERMINAL = 8; // From client
    const CLOSE_TERMINAL_SUCCESS = 9; // From server
    const CLOSE_TERMINAL_FAILURE = 10; // From server

    const MESSAGE_UNKNOWN = 11; // From server

    function TerminalWrapper(id, ip, options){
        this.options = $.extend({}, TerminalWrapper.defaults, options);

        this.term = new Terminal(options);
        this.id = id;
        this.ip = ip;
        this.isOpen = false;
    }

    TerminalWrapper.defaults = {
        cols: 80,
        rows: 24,
        screenKeys: true,
        useStyle: false,
        cursorBlink: true,
        debug: false
    };

    /**
     * Destroy the current terminal element
     */
    TerminalWrapper.prototype.close = function(){
        // NB: This also removes the DOM element,
        // and fails if it's already removed.
        if(this.isOpen){
            this.term.destroy();
        }

        this.isOpen = false;
    };

    /**
     * Open the terminal in the given jquery element (opens only one terminal)
     *
     * @param $container JQuery
     */
    TerminalWrapper.prototype.open = function($container){
        this.term.open($container[0]);
        this.isOpen = true;
    };

    /**
     * Writes data into the terminal element
     *
     * @param data string
     */
    TerminalWrapper.prototype.write = function(data){
        this.term.write(data);
    };

    function Socketty(options){
        this.options = $.extend({}, Socketty.defaults, options);
        this._terminalWrappers = {};
    }

    Socketty.defaults = {
        'url': 'ws://localhost:8080',
        'reconnectTime': 5,
        'debug': false,
        'onOpen': function(){},
        'onClose': function(reason){},
        'onError': function(){},

        'onTerminalCreated': function(terminalWrapper){},
        'onTerminalCreateFailure': function(terminalWrapper, msg){},
        'onTerminalClose': function(terminalWrapper, msg){},
        'onTerminalReadFailure': function(terminalWrapper, msg){},
        'onTerminalWriteFailure': function(terminalWrapper, msg){}
    };

    var uniqueId = 0;
    Socketty.getUniqueId = function(){
        uniqueId++;
        return uniqueId;
    };

    /**
     * Connect the web socket
     */
    Socketty.prototype.connect = function(){
        this._conn = new WebSocket(this.options.url);
        this._setWebSocketListeners();
    };

    /**
     * Check if the web socket is currently open
     *
     * @returns {boolean}
     */
    Socketty.prototype.isConnected = function(){
        return this._conn.readyState == WebSocket.OPEN;
    };

    /**
     * Close the web socket
     */
    Socketty.prototype.close = function(){
        this._conn.close();
    };

    /**
     * Listen to the various web socket events
     */
    Socketty.prototype._setWebSocketListeners = function(){
        var that = this;

        this._conn.onopen = function(e){
            that._log('Connection established');
            that.options.onOpen();
        };

        this._conn.onmessage = function(e) {
            that._log('Msg received: ' + e.data);
            var data = JSON.parse(e.data);
            var terminalWrapper = that._terminalWrappers[data.id];

            switch(data.t){
                case CREATE_TERMINAL_SUCCESS:
                    that._log('Terminal created');
                    that.options.onTerminalCreated(terminalWrapper);
                    break;
                case CREATE_TERMINAL_FAILURE:
                    that._log('Terminal create failed: ' + data.msg);
                    that.options.onTerminalCreateFailure(terminalWrapper, data.msg);
                    that._closeTerminal(terminalWrapper, 'Closed due to previous error');
                    break;
                case READ_TERMINAL_DATA:
                    terminalWrapper.write(data.d);
                    break;
                case READ_TERMINAL_DATA_FAILURE:
                    that._log('Error reading data from remote: ' + data.msg);
                    that.options.onTerminalReadFailure(terminalWrapper, data.msg);
                    break;
                case WRITE_TERMINAL_DATA_FAILURE:
                    that._log('Error writing data to remote: ' + data.msg);
                    that.options.onTerminalWriteFailure(terminalWrapper, data.msg);
                    break;
                case CLOSE_TERMINAL_SUCCESS:
                    that._log('Terminal closed by server');
                    that._closeTerminal(terminalWrapper, 'Closed by server');
                    break;
                case CLOSE_TERMINAL_FAILURE:
                    that._log('Close terminal failure: ' + data.msg);
                    that._closeTerminal(terminalWrapper, 'Terminal not properly closed by server - ' + data.msg);
                    break;
                case MESSAGE_UNKNOWN:
                    that._log('Message was unknown to server. Message type: ' + data.type);
                    that._closeTerminal(terminalWrapper, 'Protocol message was unknown to server');
                    break;
            }
        };

        this._conn.onerror = function(){
            that._log('Connection error');
            that.options.onError();
        };

        this._conn.onclose = function(e) {
            that._log('Connection closed');

            for(var id in that._terminalWrappers){
                if(that._terminalWrappers.hasOwnProperty(id)){
                    that._closeTerminal(that._terminalWrappers[id], 'Terminal closed because connection was lost');
                }
            }

            that.options.onClose(e.reason);

            // Retry connection every <options.reconnectTime> seconds
            setTimeout(function(){
                that.connect();
            }, that.options.reconnectTime*1000);
        };
    };

    /**
     * Logs to console if debug is enabled
     *
     * @param msg string
     */
    Socketty.prototype._log = function(msg){
        if(this.options.debug){
            console.log(msg);
        }
    };

    /**
     * Send a message through the web socket
     * The type is a constant defined in the Socketty class
     *
     * @param type int
     * @param obj object
     */
    Socketty.prototype._send = function (type, obj){
        if(!this.isConnected()){
            this._log('Cannot send message because the web socket is not connected');
            return;
        }

        obj.t = type;
        var msg = JSON.stringify(obj);
        this._conn.send(msg);
        this._log('Msg sent: ' + msg);
    };

    /**
     * Close a terminal and notify listeners
     *
     * @param terminalWrapper TerminalWrapper
     * @param msg string
     */
    Socketty.prototype._closeTerminal = function(terminalWrapper, msg){
        this.options.onTerminalClose(terminalWrapper, msg);
        terminalWrapper.close();
        delete this._terminalWrappers[terminalWrapper.id];

    };

    /**
     * Sends a request to the server to close the terminal
     *
     * @param id int
     */
    Socketty.prototype.requestCloseTerminal = function (id){
        this._send(CLOSE_TERMINAL, {
           'id': id
        });
    };

    /**
     * Sends a request to the server to create a new terminal to the given ip address
     *
     * @param ip string
     * @param username string
     * @param password string
     * @param terminalOptions object Options for the term.js library
     * @returns {TerminalWrapper}
     */
    Socketty.prototype.requestCreateTerminal = function(ip, username, password, terminalOptions){
        var that = this;
        var id = Socketty.getUniqueId();
        var terminalWrapper = new TerminalWrapper(id, ip, terminalOptions);
        this._terminalWrappers[id] = terminalWrapper;

        terminalWrapper.term.on('data', function(data){
            that._send(WRITE_TERMINAL_DATA, {
                'id': id,
                'd': data
            });
        });

        this._send(CREATE_TERMINAL, {
            'id': id,
            'ip': ip,
            'username': username,
            'password': password
        });

        return terminalWrapper;
    };

    this.Socketty = Socketty;
})();
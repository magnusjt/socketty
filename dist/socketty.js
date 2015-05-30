;(function($){
    function SockettyTerminal(id, ip, options){
        this.options = $.extend({}, SockettyTerminal.defaults, options);

        this.term = new Terminal(options);
        this.id = id;
        this.ip = ip;
        this.isOpen = false;
        this.isRecording = false;
        this.recordBuffer = '';
    }

    SockettyTerminal.defaults = {
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
    SockettyTerminal.prototype.close = function(){
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
    SockettyTerminal.prototype.open = function($container){
        this.term.open($container[0]);
        this.isOpen = true;
    };

    /**
     * Writes data into the terminal element
     *
     * @param data string
     */
    SockettyTerminal.prototype.write = function(data){
        if(this.isRecording){
            this.recordBuffer += data;
        }

        this.term.write(data);
    };

    SockettyTerminal.prototype.paste = function(data){
        this.term.send(data);
    };

    SockettyTerminal.prototype.setRecord = function(isRecording){
        this.isRecording = isRecording;
    };

    SockettyTerminal.prototype.getRecorded = function(){
        return this.recordBuffer;
    };

    this.SockettyTerminal = SockettyTerminal;
})(jQuery);
;(function($){
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

    const AUTHENTICATE = 12; // From client
    const AUTHENTICATION_SUCCESS = 13; // From server
    const AUTHENTICATION_FAILURE = 14; // From server

    function SockettyClient(options){
        this._options = $.extend({}, SockettyClient.defaults, options);
        this._isAuthenticated = false;
        this._retry = true;
        this._terminals = {};
        this._connect();
    }

    SockettyClient.defaults = {
        'url': 'wss://localhost:443',
        'reconnectTime': 5,
        'debug': false,
        'onOpen': function(){},
        'onClose': function(){},
        'onError': function(){},
        'onAuthFailure': function(){},
        'onAuthSuccess': function(){},
        'onTerminalCreated': function(terminalWrapper){},
        'onTerminalCreateFailure': function(terminalWrapper, msg){},
        'onTerminalClose': function(terminalWrapper, msg){},
        'onTerminalReadFailure': function(terminalWrapper, msg){},
        'onTerminalWriteFailure': function(terminalWrapper, msg){}
    };

    var uniqueId = 0;
    SockettyClient.getUniqueId = function(){
        uniqueId++;
        return uniqueId;
    };

    SockettyClient.prototype.getTerminalById = function(id){
        return this._terminals[id];
    };

    /**
     * Sends a request to the server to close the terminal
     *
     * @param id int
     */
    SockettyClient.prototype.requestCloseTerminal = function (id){
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
     * @returns {SockettyTerminal}
     */
    SockettyClient.prototype.requestCreateTerminal = function(ip, username, password, terminalOptions){
        var that = this;
        var id = SockettyClient.getUniqueId();
        var terminalWrapper = new SockettyTerminal(id, ip, terminalOptions);
        this._terminals[id] = terminalWrapper;

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

    /**
     * Connect the web socket
     */
    SockettyClient.prototype._connect = function(){
        this._conn = new WebSocket(this._options.url);
        this._setWebSocketListeners();
    };

    SockettyClient.prototype._close = function(){
        this._conn.close();
    };

    /**
     * Check if the web socket is currently open
     *
     * @returns {boolean}
     */
    SockettyClient.prototype.isConnected = function(){
        return this._conn.readyState == WebSocket.OPEN;
    };

    SockettyClient.prototype.isAuthenticated = function(){
        return this._isAuthenticated;
    };

    /**
     * Listen to the various web socket events
     */
    SockettyClient.prototype._setWebSocketListeners = function(){
        var that = this;

        this._conn.onopen = function(e){
            that._log('Connection established');
            that._send(AUTHENTICATE);
            that._options.onOpen();
        };

        this._conn.onmessage = function(e) {
            that._log('Msg received: ' + e.data);
            var data = JSON.parse(e.data);
            that._handleMessage(data.type, data.value);
        };

        this._conn.onerror = function(){
            that._log('Connection error');
            that._options.onError();
        };

        this._conn.onclose = function(e) {
            that._log('Connection closed');

            for(var id in that._terminals){
                if(that._terminals.hasOwnProperty(id)){
                    that._closeTerminal(that._terminals[id], 'Terminal closed because connection was lost');
                }
            }

            that._options.onClose();

            // Retry connection every <options.reconnectTime> seconds
            if(that._retry){
                setTimeout(function(){
                    that._connect();
                }, that._options.reconnectTime*1000);
            }
        };
    };

    SockettyClient.prototype._handleMessage = function(type, obj){
        var terminalWrapper = this._terminals[obj.id];

        switch(type){
            case CREATE_TERMINAL_SUCCESS:
                this._log('Terminal created');
                this._options.onTerminalCreated(terminalWrapper);
                break;
            case CREATE_TERMINAL_FAILURE:
                this._log('Terminal create failed: ' + obj.msg);
                this._options.onTerminalCreateFailure(terminalWrapper, obj.msg);
                this._closeTerminal(terminalWrapper, 'Closed due to previous error');
                break;
            case READ_TERMINAL_DATA:
                terminalWrapper.write(obj.d);
                break;
            case READ_TERMINAL_DATA_FAILURE:
                this._log('Error reading data from remote: ' + obj.msg);
                this._options.onTerminalReadFailure(terminalWrapper, obj.msg);
                break;
            case WRITE_TERMINAL_DATA_FAILURE:
                this._log('Error writing data to remote: ' + obj.msg);
                this._options.onTerminalWriteFailure(terminalWrapper, obj.msg);
                break;
            case CLOSE_TERMINAL_SUCCESS:
                this._log('Terminal closed by server');
                this._closeTerminal(terminalWrapper, 'Closed by server');
                break;
            case CLOSE_TERMINAL_FAILURE:
                this._log('Close terminal failure: ' + obj.msg);
                this._closeTerminal(terminalWrapper, 'Terminal not properly closed by server - ' + obj.msg);
                break;
            case MESSAGE_UNKNOWN:
                this._log('Message was unknown to server. Message: ' + JSON.stringify(obj));
                this._closeTerminal(terminalWrapper, 'Protocol message was unknown to server');
                break;
            case AUTHENTICATION_FAILURE:
                this._log('Authentication failure');
                this._retry = false;
                this._options.onAuthFailure();
                this._close();
                break;
            case AUTHENTICATION_SUCCESS:
                this._log('Authentication succeeded');
                this._isAuthenticated = true;
                this._options.onAuthSuccess();
                break;
            default:
                this._log('Message from server unknown');
        }
    };

    /**
     * Logs to console if debug is enabled
     *
     * @param msg string
     */
    SockettyClient.prototype._log = function(msg){
        if(this._options.debug){
            console.log(msg);
        }
    };

    /**
     * Send a message through the web socket
     * The type is a constant defined in the SockettyClient class
     *
     * @param type int
     * @param obj object
     */
    SockettyClient.prototype._send = function (type, obj){
        if(obj === undefined){
            obj = {};
        }

        if(!this.isConnected()){
            this._log('Cannot send message because the web socket is not connected');
            return;
        }

        var message = {
            'type': type,
            'value': obj
        };

        var msg = JSON.stringify(message);
        this._conn.send(msg);
        this._log('Msg sent: ' + msg);
    };

    /**
     * Close a terminal and notify listeners
     *
     * @param terminalWrapper SockettyTerminal
     * @param msg string
     */
    SockettyClient.prototype._closeTerminal = function(terminalWrapper, msg){
        this._options.onTerminalClose(terminalWrapper, msg);
        terminalWrapper.close();
        delete this._terminals[terminalWrapper.id];

    };

    this.SockettyClient = SockettyClient;
})(jQuery);
var EventEmitter = require('events').EventEmitter;

export default class ConnectionPool{
    constructor() {
        this.connections = new Map();
    }

    getConnection(url){
        if (!this.connections.has(url)) {
            this.connections.set(url, new Connection(url));
        }

        return this.connections.get(url);
    }

    removeConnection(url){
        this.connections.delete(url);
    }
}

class Connection extends EventEmitter{
    constructor(url){
        super();
        this.url = url;
        this.authenticated = false;
        this.reconnect = true;
        this._connect();
    }

    _connect(){
        this.retry = true;
        this.websocket = new WebSocket(this.url);

        this.websocket.onopen = () => {
            this.emit('open');
        };

        this.websocket.onclose = () => {
            this.emit('close');
            if(this.reconnect){
                setTimeout(() => {this._connect();}, 5*1000);
            }
        };
        this.websocket.onerror = () => {
            this.emit('error');
        };

        this.websocket.onmessage = (message) => {
            switch(message.data){
                case 'auth_failure':
                    this.authenticated = false;
                    this.reconnect = false;
                    this.emit('auth_failure');
                    break;
                case 'auth_success':
                    this.authenticated = true;
                    this.emit('auth_success');
                    break;
                default:
                    var obj = JSON.parse(message.data);
                    this.emit('data', obj.id, obj.type, obj.value);
                    break;
            }
        };
    }

    send(terminalId, type, value){
        if(value === undefined){
            value = {};
        }

        if(this.isConnected() && this.isAuthenticated()){
            this.websocket.send(JSON.stringify({'id': terminalId, 'type': type, 'value': value}));
            return true;
        }

        return false;
    };

    isConnected(){
        return this.websocket.readyState == WebSocket.OPEN;
    };

    isAuthenticated(){
        return this.authenticated;
    };
}
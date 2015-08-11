/*
Connection is a wrapper for a websocket.
It handles the websocket events (open, close, error, message).
This class most resembles the Socketty class on the server.

open
  emit open event

close
  emit close event
  reconnect after some time, if reconnects are enabled

error
  emit error event

message
  Check if the message is related to authentication
    If so, emit auth event and disable reconnects in the case where authentication failed
  Decode the message (parse from json) and emit it in a data event

send
  Only continue if socket is connected and authenticated
  Encode message and send it
 */
var EventEmitter = require('events').EventEmitter;

export default class Connection extends EventEmitter{
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
                var seconds = 5;
                setTimeout(() => {
                    this._connect();
                }, seconds*1000);
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
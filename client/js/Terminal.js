var EventEmitter = require('events').EventEmitter;
var termjs = require('term.js');
var moment = require('moment');

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

var nextTerminalId = 0;
export default class Terminal extends EventEmitter{
    constructor(conn, cmd='', name=''){
        super();
        this.id = nextTerminalId++;
        this.conn = conn;
        this.isOpen = false;
        this.buffer = '';
        this.defaultCmd = cmd;
        this.destroyed = false;
        this.status = {'msg': 'Terminal closed', 'type': 'error'};

        this.inputName = name;
        if(name.length > 0){
            this.name = name;
        }else{
            this.name = 'New Terminal';
        }

        this.term = new termjs.Terminal({
            cols:        120,
            rows:        30,
            screenKeys:  false,
            useStyle:    false,
            cursorBlink: true,
            debug:       true
        });

        this.term.on('data', (data) => {
            this.send(data);
        });

        this.connListeners = [
            {event: 'open', listener: () => {this._onConnOpen();}},
            {event: 'close', listener: () => {this._onConnClose();}},
            {event: 'error', listener: () => {this._onConnError();}},
            {event: 'data', listener: (id, type, value) => {this._onConnData(id, type, value);}},
            {event: 'auth_success', listener: () => {this._onConnAuthSuccess();}},
            {event: 'auth_failure', listener: () => {this._onConnAuthFailure();}}
        ];

        this.connListeners.forEach((item) => {
             this.conn.on(item.event, item.listener);
        });
    }
    destroy(){
        this.destroyed = true;
        this.close();
        super.removeAllListeners();

        this.connListeners.forEach((item) => {
            this.conn.removeListener(item.event, item.listener);
        });
        this.connListeners = [];

        this.term.destroy();
        this.term = null;
    }
    _onConnOpen(){
        this.writeColorStatus({msg: 'Connected to server', type: 'success'});
    }
    _onConnClose(){
        this.writeColorStatus({msg: 'Disconnected from server', type: 'error'});
        var status = {'msg': 'Terminal closed due to lost connection', 'type': 'error'};
        this._changeStatus(status);
        this.isOpen = false;
    }
    _onConnError(){
        this.writeColorStatus({msg: 'Connection error', type: 'error'});
    }
    _onConnAuthSuccess(){
        this.writeColorStatus({msg: 'Authenticated', type: 'success'});
    }
    _onConnAuthFailure(){
        this.writeColorStatus({msg: 'Authentication failure', type: 'error'});
    }
    _onConnData(id, type, value){
        if(id !== this.id){
            return;
        }

        this._handleMessage(type, value);
    }
    _changeStatus(status){
        this.status = status;
        this.emit('status');
    }
    open(cmd){
        if(this.isOpen){
            this.close();
        }
        if(this.inputName.length == 0){
            this.name = cmd;
        }

        this.conn.send(this.id, CREATE_TERMINAL, {
            'cmd': cmd
        });
    }
    send(data){
        if(this.isOpen){
            this.conn.send(this.id, WRITE_TERMINAL_DATA,  {'d': data});
        }
    }
    close(){
        if(this.isOpen){
            this.conn.send(this.id, CLOSE_TERMINAL);
        }
    }
    writeColorStatus(status){
        var msg = moment().format('HH:mm:ss') + ' ' + status.msg;

        var red = '31';
        var green = '32';
        var blue = '34';
        var color = red;
        if(status.type == 'error' || status.type == 'warning'){
            color = red;
        }else if(status.type == 'info'){
            color = blue;
        }else if(status.type == 'success'){
            color = green;
        }

        var bold = '\x1b[1m';
        var escapeStart = '\x1b['+color+'m' + bold;
        var escapeEnd = '\x1b[m';

        this.term.write(escapeStart + '>>> ' + msg + ' <<<' + escapeEnd + escapeEnd + '\r\n');
    }
    _handleMessage(type, value){
        var status = null;
        switch(type){
            case CREATE_TERMINAL_SUCCESS:
                status = {msg: 'Terminal open', type: 'success'};
                this.isOpen = true;
                break;
            case CREATE_TERMINAL_FAILURE:
                status = {msg: 'Failed to create terminal: ' + value.msg, type: 'error'};
                this.isOpen = false;
                break;
            case READ_TERMINAL_DATA:
                this.buffer += value.d;
                this.term.write(value.d);
                break;
            case READ_TERMINAL_DATA_FAILURE:
                status = {msg: 'Failed to read from remote: ' + value.msg, type: 'error'};
                break;
            case WRITE_TERMINAL_DATA_FAILURE:
                status = {msg: 'Failed to write to remote: ' + value.msg, type: 'error'};
                break;
            case CLOSE_TERMINAL_SUCCESS:
                status = {msg: 'Terminal closed', type: 'info'};
                this.isOpen = false;
                break;
            case CLOSE_TERMINAL_FAILURE:
                status = {msg: 'Terminal could not be closed properly: ' + value.msg, type: 'error'};
                break;
            case MESSAGE_UNKNOWN:
                status = {msg: 'Message was unknown to the server. Weird.', type: 'error'};
                break;
            default:
                status = {msg: 'Received an unknown message from the server', type: 'error'};
                break;
        }

        if(status !== null){
            this.writeColorStatus(status);
            this._changeStatus(status);
        }
    }
}

import ConnectionPool from './Connection.js';
var EventEmitter = require('events').EventEmitter;
var connPool = new ConnectionPool();

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
export default class Client extends EventEmitter{
    constructor(url){
        super();
        this.id = nextTerminalId++;
        this.conn = connPool.getConnection(url);
        this.terminalIsOpen = false;
        this._setConnectionListeners();
    }
    _setConnectionListeners(){
        this.conn.on('open', () => {
            this.emit('connection_open');
        });
        this.conn.on('close', () => {
            this.terminalIsOpen = false;
            this.emit('connection_lost');
        });
        this.conn.on('error', () => {
            this.emit('connection_error');
        });
        this.conn.on('auth_failure', () => {
            this.emit('session_auth_failure');
        });
        this.conn.on('auth_success', () => {
            this.emit('session_auth_success');
        });
        this.conn.on('data', (id, type, value) => {
            if(id !== this.id){
                return;
            }

            this._handleMessage(type, value);
        });
    }
    open(ip, username, password){
        if(this.terminalIsOpen){
            this.close();
        }

        this.conn.send(this.id, CREATE_TERMINAL, {
            'ip': ip,
            'username': username,
            'password': password
        });
    }
    send(data){
        if(this.terminalIsOpen){
            this.conn.send(this.id, WRITE_TERMINAL_DATA,  {'d': data});
        }
    }
    close(){
        if(this.terminalIsOpen){
            this.conn.send(this.id, CLOSE_TERMINAL);
        }
    }
    _handleMessage(type, value){
        switch(type){
            case CREATE_TERMINAL_SUCCESS:
                this.terminalIsOpen = true;
                this.emit('terminal_opened');
                break;
            case CREATE_TERMINAL_FAILURE:
                this.terminalIsOpen = false;
                this.emit('terminal_open_error', 'Failed to create terminal: ' + value.msg);
                break;
            case READ_TERMINAL_DATA:
                this.emit('terminal_rxdata', value.d);
                break;
            case READ_TERMINAL_DATA_FAILURE:
                this.emit('terminal_rxdata_error', 'Failed to read from remote: ' + value.msg);
                break;
            case WRITE_TERMINAL_DATA_FAILURE:
                this.emit('terminal_txdata_error', 'Failed to write to remote: ' + value.msg);
                break;
            case CLOSE_TERMINAL_SUCCESS:
                this.terminalIsOpen = false;
                this.emit('terminal_closed');
                break;
            case CLOSE_TERMINAL_FAILURE:
                this.emit('terminal_close_error',  'Terminal could not be closed properly: ' + value.msg);
                break;
            case MESSAGE_UNKNOWN:
                this.emit('terminal_error', 'Message was unknown to the server. Weird.');
                break;
            default:
                this.emit('terminal_error', 'Received an unknown message from the server. Throwing it away.');
                break;
        }
    }
}

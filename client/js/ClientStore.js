var EventEmitter = require('events').EventEmitter;
var Dispatcher = require('./Dispatcher');
import {Constants} from './Actions.js';
import Connection from './Connection.js';
import Terminal from './Terminal.js';

class ClientStore extends EventEmitter{
    constructor(){
        super();
        super.setMaxListeners(20);
        this.conn = null;

        this.selectedIndex = 0;
        this.terminals = [];

        this.connStatus = {msg: 'Disconnected', type: 'error'};
        this.authStatus = {msg: 'Not authenticated', type: 'error'};
    }
    connect(url){
        if(this.conn){
            this.conn.removeAllListeners();
        }

        this.conn = new Connection(url);

        if(this.conn.isConnected()){
            this.connStatus = {msg: 'Connected to server', type: 'success'};
        }
        if(this.conn.isAuthenticated()){
            this.authStatus = {msg: 'Authenticated', type: 'success'};
        }

        this.conn.on('open', this._onConnOpen.bind(this));
        this.conn.on('close', this._onConnClose.bind(this));
        this.conn.on('error', this._onConnError.bind(this));
        this.conn.on('auth_success', this._onConnAuthSuccess.bind(this));
        this.conn.on('auth_failure', this._onConnAuthFailure.bind(this));
    }
    _onConnOpen(){
        this.connStatus = {msg: 'Connected to server', type: 'success'};
        this.emitConnEvent();
    }
    _onConnClose(){
        this.connStatus = {msg: 'Disconnected from server', type: 'error'};
        this.authStatus = {msg: 'Not authenticated', type: 'error'};
        this.emitConnEvent();
    }
    _onConnError(){
        this.connStatus = {msg: 'Connection error', type: 'error'};
        this.emitConnEvent();
    }
    _onConnAuthSuccess(){
        this.authStatus = {msg: 'Authenticated', type: 'success'};
        this.emitConnEvent();
    }
    _onConnAuthFailure(){
        this.authStatus = {msg: 'Authentication failure', type: 'error'};
        this.emitConnEvent();
    }

    addChangeListener(callback) {
        this.on('change', callback);
    }
    removeChangeListener(callback) {
        this.removeListener('change', callback);
    }
    emitChange(){
        this.emit('change');
    }

    addConnEventListener(callback){
        this.on('conn', callback);
    }
    removeConnEventListener(callback){
        this.removeListener('conn', callback);
    }
    emitConnEvent(){
        this.emit('conn');
    }

    getTerminals(){
        return this.terminals;
    }
    getConnStatus(){
        return this.connStatus;
    }
    getAuthStatus(){
        return this.authStatus;
    }
    getSelectedIndex(){
        return this.selectedIndex;
    }

    selectTerminal(i) {
        this.selectedIndex = i;
        this.emitChange();
    }

    addTerminal(cmd = '', name=''){
        if(!this.conn){
            return;
        }

        var terminal = new Terminal(this.conn, cmd, name);
        this.terminals.push(terminal);
        this.selectedIndex = this.terminals.length-1;
        this.emitChange();

        terminal.on('status', () => {
            this.emitChange();
        });
    }

    removeTerminal(i){
        this.terminals[i].destroy();

        if(i == this.selectedIndex){
            this.selectedIndex = 0;
            for(var possibleIndex = 0; possibleIndex < this.terminals.length; possibleIndex++){
                if(!this.terminals[possibleIndex].destroyed){
                    this.selectedIndex = possibleIndex;
                    break;
                }
            }
        }

        this.emitChange();
    }
}
export var clientStore = new ClientStore();

Dispatcher.register(function(action) {
    switch (action.actionType) {
        case Constants.ADD_TERMINAL:
            clientStore.addTerminal(action.cmd, action.name);
            break;
        case Constants.REMOVE_TERMINAL:
            clientStore.removeTerminal(action.index);
            break;
        case Constants.SELECT_TERMINAL:
            clientStore.selectTerminal(action.index);
            break;
        case Constants.CONNECT:
            clientStore.connect(action.url);
            break;
    }
});
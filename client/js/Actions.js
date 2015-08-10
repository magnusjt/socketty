var dispatcher = require('./Dispatcher');

export var Constants = {
    'CONNECT': 'CONNECT',
    'ADD_TERMINAL': 'ADD_TERMINAL',
    'REMOVE_TERMINAL': 'REMOVE_TERMINAL',
    'SELECT_TERMINAL': 'SELECT_TERMINAL'

};

export function connect(url){
    dispatcher.dispatch({
        actionType: Constants.CONNECT,
        url
    });
}
export function addTerminal(cmd = '', name = ''){
    dispatcher.dispatch({
        actionType: Constants.ADD_TERMINAL,
        cmd, name
    });
}
export function removeTerminal(index){
    dispatcher.dispatch({
        actionType: Constants.REMOVE_TERMINAL,
        index
    });
}
export function selectTerminal(index){
    dispatcher.dispatch({
        actionType: Constants.SELECT_TERMINAL,
        index
    });
}
var React = require('react');
import Socketty from './js/Socketty.jsx';
import * as Actions from './js/Actions.js';

Actions.connect('wss://localhost:5678');

var opts = [
    {
        name: 'SSH',
        list: [
            {cmd: 'ssh vagrant@127.0.0.1', 'name': 'Vagrant SSH'},
            {cmd: 'ping 127.0.0.1', 'name': 'Ping localhost'}
        ]
    },
    {
        name: 'Stats',
        list: [
            {cmd: 'top', 'name': 'Top'}
        ]
    }
];

var component = React.createElement(Socketty, {opts});
React.render(component, document.getElementById('app'));
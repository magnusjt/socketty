var React = require('react');
import {connect} from './client/js/Actions.js';
import Socketty from './client/js/Socketty.jsx';

module.exports.start = function(domId, wssUrl, opts){
    connect(wssUrl);
    React.render(React.createElement(Socketty, {opts}), document.getElementById(domId));
};
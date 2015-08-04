var React = require('react');
var termjs = require('term.js');
var moment = require('moment');
import Client from './Client.js';
import saveData from './SaveData.js';

var SockettyTerminal = React.createClass({
    getDefaultProps(){
        return {
            url:         'wss://localhost:5678',
            ip:          '',
            username:    '',
            cols:        120,
            rows:        30,
            screenKeys:  false,
            useStyle:    false,
            cursorBlink: true,
            debug:       false,
            record:      true
        };
    },
    getInitialState(){
        return {
            connStatus: {msg: 'Disconnected', type: 'error'},
            authStatus: {msg: 'Not authenticated', type: 'error'},
            termStatus: {msg: 'Terminal closed', type: 'error'}
        };
    },
    addMessage(msg, type){
        if(this.props.debug){
            msg = moment().format('HH:mm:ss') + ' ' + msg;
            console.log(msg);
            this.addMessageToTerminal(msg, type);
        }
    },
    addMessageToTerminal(msg, type){
        var red = '31';
        var green = '32';
        var blue = '34';
        var color = red;
        if(type == 'error' || type == 'warning'){
            color = red;
        }else if(type == 'info'){
            color = blue;
        }else if(type == 'success'){
            color = green;
        }

        var bold = '\x1b[1m';
        var escapeStart = '\x1b['+color+'m' + bold;
        var escapeEnd = '\x1b[m';

        if(this.termIsOpen){
            this.term.write(escapeStart + '>>> ' + msg + ' <<<' + escapeEnd + escapeEnd + '\r\n');
        }
    },
    setConnStatus(status, type = 'info'){
        this.addMessage(status, type);
        this.setState({connStatus: {msg: status, type: type}});
    },
    setAuthStatus(status, type = 'info'){
        this.addMessage(status, type);
        this.setState({authStatus: {msg: status, type: type}});
    },
    setTermStatus(status, type = 'info'){
        this.addMessage(status, type);
        this.setState({termStatus: {msg: status, type: type}});
    },
    componentWillMount(){
        this.termIsOpen = false;
        this.buffer = '';
        this.client = new Client(this.props.url);
        this.term = new termjs.Terminal({
            cols:        this.props.cols,
            rows:        this.props.rows,
            screenKeys:  this.props.screenKeys,
            cursorBlink: this.props.cursorBlink,
            debug:       this.props.debug
        });

        this.term.on('data', (data) => {this.client.send(data);});

        if(this.client.conn.isConnected()){this.setConnStatus('Connected to server', 'success');}
        if(this.client.conn.isAuthenticated()){this.setAuthStatus('Authenticated', 'success');}

        this.client.on('connection_open', () => {this.setConnStatus('Connected to server', 'success');});
        this.client.on('connection_lost', () => {this.setConnStatus('Disconnected from server', 'error');});
        this.client.on('connection_error', () => {this.setConnStatus('Connection error', 'error');});
        this.client.on('session_auth_failure', () => {this.setAuthStatus('Authentication failure', 'error');});
        this.client.on('session_auth_success', () => {this.setAuthStatus('Authenticated', 'success');});
        this.client.on('terminal_opened', () => {this.setTermStatus('Terminal open', 'success');});
        this.client.on('terminal_open_error', (msg) => {this.setTermStatus(msg, 'error');});
        this.client.on('terminal_closed', () => {this.setTermStatus('Terminal closed', 'info');});
        this.client.on('terminal_close_error', (msg) => {this.setTermStatus(msg, 'error');});
        this.client.on('terminal_rxdata_error', (msg) => {this.setTermStatus(msg, 'error');});
        this.client.on('terminal_txdata_error', (msg) => {this.setTermStatus(msg, 'error');});
        this.client.on('terminal_error', (msg) => {this.setTermStatus(msg, 'error');});
        this.client.on('terminal_rxdata', (data) => {
            this.term.write(data);
            if(this.props.record){
                this.buffer += data;
            }
        });
    },
    componentDidMount(){
        this.term.open(React.findDOMNode(this.refs.terminal));
        this.termIsOpen = true;
    },
    componentWillUnmount(){
        this.client.close();
        this.term.destroy();
        this.termIsOpen = false;
    },
    open(ip, username, password){
        this.setState({connectionState: 'waiting'});
        this.client.open(ip, username, password);
    },
    download(){
        saveData(this.buffer, moment().format('YYYYMMDD_HHmmss_') + 'copy.txt');
    },
    paste(){
        var pasteTextarea = React.findDOMNode(this.refs.pastearea);
        var text = pasteTextarea.value;
        var indexOfFirstNewline = text.indexOf("\n");
        var firstLine;
        if(indexOfFirstNewline == -1){
            firstLine = text + "\n";
            text = '';
        }else{
            firstLine = text.substr(0, indexOfFirstNewline+1); // plus 1 to get the newline as well
            text = text.substr(indexOfFirstNewline+1);
        }

        this.term.send(firstLine);
        pasteTextarea.value = text;
    },
    onClickConnect(){
        this.open(
            React.findDOMNode(this.refs.ip).value,
            React.findDOMNode(this.refs.username).value,
            React.findDOMNode(this.refs.password).value
        );
    },
    render(){
        return (
            <div>
                <div className="row">
                    <div className="col-lg-7">
                        <div className="form-inline socketty-form">
                            <input type="text" className="form-control input-sm" placeholder="IP" defaultValue={this.props.ip} ref="ip" />
                            <input type="text" className="form-control input-sm" placeholder="Username" defaultValue={this.props.username} ref="username" />
                            <input type="password" className="form-control input-sm" placeholder="Password" ref="password" />
                            <button id="connect-button" className="btn btn-sm btn-default" onClick={this.onClickConnect}>
                                <span className="glyphicon glyphicon-console"></span> Connect
                            </button>
                        </div>
                        <div>
                            <Status type={this.state.connStatus.type} msg={this.state.connStatus.msg} />
                            <Status type={this.state.authStatus.type} msg={this.state.authStatus.msg} />
                            <Status type={this.state.termStatus.type} msg={this.state.termStatus.msg} />
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-lg-7">
                        <div ref="terminal"></div>
                    </div>
                    <div className="col-lg-5">
                        <div className="form-group">
                            <textarea className="form-control socketty-paste-textarea" ref="pastearea"></textarea>
                            <button className="btn btn-default btn-sm" onClick={this.paste}>
                                <span className="glyphicon glyphicon-paste"></span> Paste first line
                            </button>
                            <button className="btn btn-default btn-sm" onClick={this.download}>
                                <span className="glyphicon glyphicon-copy"></span> Download output
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});
export default SockettyTerminal;

var Status = React.createClass({
   render(){
       var className = '';
       switch(this.props.type){
           case 'info':
               className = 'bg-info';
               break;
           case 'error':
               className = 'bg-danger';
               break;
           case 'warning':
               className = 'bg-warning';
               break;
           case 'success':
               className = 'bg-success';
               break;
           default:
               className = 'bg-info';
               break;
       }

       className += ' socketty-status';

       return (
            <span className={className}>{this.props.msg}</span>
       );
   }
});
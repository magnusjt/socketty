var React = require('react');
var moment = require('moment');
var _ = require('lodash');
import {clientStore} from './ClientStore.js';
import saveData from './SaveData.js';
import * as Actions from './Actions.js';

var Socketty = React.createClass({
    getDefaultProps(){
        return {
            opts: []
        }
    },
    getInitialState(){
        return {
            terminals: clientStore.getTerminals(),
            selectedIndex: clientStore.getSelectedIndex(),
            connStatus: clientStore.getConnStatus(),
            authStatus: clientStore.getAuthStatus()
        }
    },
    componentDidMount(){
        clientStore.addChangeListener(this.onChange);
        clientStore.addConnEventListener(this.onConnEvent);
    },
    componentWillUnmount(){
        clientStore.removeChangeListener(this.onChange);
        clientStore.removeConnEventListener(this.onConnEvent);
    },
    onChange(){
        this.setState({
            terminals: clientStore.getTerminals(),
            selectedIndex: clientStore.getSelectedIndex()
        });
    },
    onConnEvent(){
        this.setState({
            connStatus: clientStore.getConnStatus(),
            authStatus: clientStore.getAuthStatus()
        });
    },
    render(){
        return (
            <div>
                <div className="row">
                    <div className="col-lg-2 socketty-sidebar">
                        <h4>Status</h4>
                        <Status type={this.state.connStatus.type} msg={this.state.connStatus.msg} />
                        <Status type={this.state.authStatus.type} msg={this.state.authStatus.msg} />
                        <h4>Presets</h4>
                        <Sidebar opts={this.props.opts} />
                    </div>
                    <div className="col-lg-10 socketty-main">
                        <Tabs terminals={this.state.terminals} selectedIndex={this.state.selectedIndex} />
                    </div>
                </div>
            </div>
        );
   }
});
export default Socketty;

var Sidebar = React.createClass({
    getDefaultProps(){
        return {
            opts: []
        }
    },
    render(){
        return (
            <div className="socketty-sidebar-list">
                {this.props.opts.map(function(opt){
                    var i = 0;
                    return (
                        <ul key={opt.name}>
                            <li>
                                <h5>{opt.name}</h5>
                                <ul>
                                    {opt.list.map(function(item){
                                        i++;
                                        return <SidebarItem cmd={item.cmd} name={item.name} key={i} />
                                    })}
                                </ul>
                            </li>
                        </ul>
                    );
                })}
            </div>
        );
    }
});
var SidebarItem = React.createClass({
    onOpenNewTab(){
        Actions.addTerminal(this.props.cmd, this.props.name);
    },
    render(){
        return (
            <li onClick={this.onOpenNewTab}>
                {this.props.name.length > 0 ?
                    <span>{this.props.name}</span>
                :
                    <span>{this.props.cmd}</span>
                }
            </li>
        );
    }
});

var Tabs = React.createClass({
    getDefaultProps(){
        return {
            terminals: [],
            selectedIndex: 0
        }
    },
    onOpenNewTerminal(){
        Actions.addTerminal();
    },
    render(){
        var that = this;
        return (
            <div>
                <nav className="navbar navbar-default socketty-navbar">
                    <ul className="nav navbar-nav socketty-tabs">
                        {this.props.terminals.map(function(terminal, i){
                            if(that.props.terminals[i].destroyed){
                                return null;
                            }

                            var selected = false;
                            if(i == that.props.selectedIndex){
                                selected = true;
                            }

                            return <TabItem index={i} name={terminal.name} selected={selected} key={i} />
                        })}
                        <li>
                            <span onClick={this.onOpenNewTerminal} className="glyphicon glyphicon-plus socketty-tab-icon" title="Open a new tab"></span>
                        </li>
                    </ul>
                </nav>
                {this.props.terminals.map(function(terminal, i){
                    var show = false;
                    if(i == that.props.selectedIndex){
                        show = true;
                    }

                    return <Terminal terminal={terminal} show={show} key={i} />
                })}
            </div>
        );
    }
});
var TabItem = React.createClass({
    getDefaultProps(){
        return {
            selected: false,
            name: 'Name',
            index: 0
        };
    },
    onSwitchTab(){
        Actions.selectTerminal(this.props.index);
    },
    onRemoveTab(){
        Actions.removeTerminal(this.props.index);
    },
    render(){
        if(this.props.selected){
            return (
                <li className="active">
                    <span className="socketty-tab-title">
                        {this.props.name}
                    </span>
                    <span className="glyphicon glyphicon-remove socketty-tab-icon socketty-tab-remove" onClick={this.onRemoveTab} title="Close"></span>
                </li>);
        }else{
            return (
                <li>
                    <span onClick={this.onSwitchTab} className="socketty-tab-title" title="Go to tab">
                        {this.props.name}
                    </span>
                    <span className="glyphicon glyphicon-remove socketty-tab-icon socketty-tab-remove" onClick={this.onRemoveTab} title="Close"></span>
                </li>);
        }
    }
});

var Terminal = React.createClass({
    getDefaultProps(){
        return {
            terminal: {},
            show: false
        };
    },
    componentDidMount(){
        this.props.terminal.term.open(React.findDOMNode(this.refs.terminal));
    },
    onConnect(){
        this.props.terminal.open(React.findDOMNode(this.refs.cmd).value);
    },
    onDownload(){
        saveData(this.props.terminal.buffer, moment().format('YYYYMMDD_HHmmss_') + 'copy.txt');
    },
    onPaste(){
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

        this.props.terminal.term.send(firstLine);
        pasteTextarea.value = text;
    },
    render(){
        if(this.props.terminal.destroyed){
            return null;
        }

        var display = {display: 'none'};
        if(this.props.show){
            display = {display: 'block'};
        }

        return (
            <div style={display}>
                <div className="row">
                    <div className="col-lg-7">
                        <div ref="terminal"></div>
                    </div>
                    <div className="col-lg-5">
                        <Status type={this.props.terminal.status.type} msg={this.props.terminal.status.msg} />
                        <div className="form-inline socketty-form">
                            <input type="text" className="form-control input-sm" placeholder="Command (ex. ssh user@host)" defaultValue={this.props.terminal.defaultCmd} ref="cmd" />
                            <button id="connect-button" className="btn btn-sm btn-default" onClick={this.onConnect}>
                                <span className="glyphicon glyphicon-console"></span> Open
                            </button>
                        </div>
                        <div className="form-group">
                            <textarea className="form-control socketty-paste-textarea" ref="pastearea"></textarea>
                            <button className="btn btn-default btn-sm" onClick={this.onPaste}>
                                <span className="glyphicon glyphicon-paste"></span> Paste first line
                            </button>
                            <button className="btn btn-default btn-sm" onClick={this.onDownload}>
                                <span className="glyphicon glyphicon-copy"></span> Download output
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

var Status = React.createClass({
   render(){
        var classCircle = 'socketty-circle ' + this.props.type;

       return (
            <div className='socketty-status'>
                <div className={classCircle}></div> {this.props.msg}
            </div>
       );
   }
});
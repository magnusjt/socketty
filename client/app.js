var React = require('react');
import SockettyTerminal from './js/Socketty.jsx';

$(document).ready(function(){
    $("#another").click(function(){
        var ip = $("#nodes").val();

        var component = React.createElement(SockettyTerminal, {
            url: 'wss://localhost:5678',
            ip: ip,
            username: 'vagrant',
            debug: true
        });

        var $wrapper = $(
            "<div class='socketty-wrapper'>" +
                "<button role='button' class='btn btn-danger btn-sm pull-right remove'>" +
                    "<span class='glyphicon glyphicon-remove'></span> Remove" +
                "</button>" +
            "</div>"
        );

        var $element = $(
            "<div class='mount-node'></div>"
        );

        $("#terminals").append($wrapper);
        $wrapper.append($element);

        React.render(component, $element[0]);
    });

    $("#terminals").on('click', '.remove', function(){
        var $wrapper = $(this).parents('.socketty-wrapper');
        React.unmountComponentAtNode($wrapper.children('.mount-node')[0]);
        $wrapper.remove();
    });
});
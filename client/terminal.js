;(function($){
    function SockettyTerminal(id, ip, options){
        this.options = $.extend({}, SockettyTerminal.defaults, options);

        this.term = new Terminal(options);
        this.id = id;
        this.ip = ip;
        this.isOpen = false;
        this.isRecording = false;
        this.recordBuffer = '';
    }

    SockettyTerminal.defaults = {
        cols: 80,
        rows: 24,
        screenKeys: true,
        useStyle: false,
        cursorBlink: true,
        debug: false
    };

    /**
     * Destroy the current terminal element
     */
    SockettyTerminal.prototype.close = function(){
        // NB: This also removes the DOM element,
        // and fails if it's already removed.
        if(this.isOpen){
            this.term.destroy();
        }

        this.isOpen = false;
    };

    /**
     * Open the terminal in the given jquery element (opens only one terminal)
     *
     * @param $container JQuery
     */
    SockettyTerminal.prototype.open = function($container){
        this.term.open($container[0]);
        this.isOpen = true;
    };

    /**
     * Writes data into the terminal element
     *
     * @param data string
     */
    SockettyTerminal.prototype.write = function(data){
        if(this.isRecording){
            this.recordBuffer += data;
        }

        this.term.write(data);
    };

    SockettyTerminal.prototype.paste = function(data){
        this.term.send(data);
    };

    SockettyTerminal.prototype.setRecord = function(isRecording){
        this.isRecording = isRecording;
    };

    SockettyTerminal.prototype.getRecorded = function(){
        return this.recordBuffer;
    };

    this.SockettyTerminal = SockettyTerminal;
})(jQuery);
function ViewBar($query, model, dispatcher, event) {
    this.dispatcher = dispatcher;
    this.event = event;
    this.$ = $query;
    this.data = model.getConceptBars();
    this.render();
    var that = this;
    var to;
    $(window).resize(function(){ 
        clearTimeout(to);
        to = setTimeout(function(){ that.resize(); }, 500);
    })
}

ViewBar.prototype = {

    render: function() {
        var $bar = $('<div>').addClass('concept-bars');
        this.$bar = this.build($bar);
        this.$.append($("<div class='concept-bars-wrapper'>").append(this.$bar))
        this.barWidth = 0;
        var that = this;
        $bar.find('.concept-bar').first().each(function(){
            that.barWidth = $(this).width();
        })
    },
    rebuild: function() { this.build(this.$bar.html('')) },
    build: function($bar) {
        var that = this;
        $bar.append($('<div class="concept-bars-left"><div class="concept-bars-left-angle">'))
        $bar.append($('<div class="concept-bars-right"><div class="concept-bars-right-angle">'))
        $bar.find('.concept-bars-left-angle').click(function(){ that.dispatchRel(-1) })
        $bar.find('.concept-bars-right-angle').click(function(){ that.dispatchRel(1) })
        this.data.filter(function(x){ return !x.isExcluded })
                .map(function(d){
                    $bar.append($('<div>')
                            .html('<div class="concept-bar-text">'+d.title+'</div>')
                            .data('d', d)
                            .addClass('concept-bar')
                            .click(function(){
                                that.dispatcher.event( that.event, $(this).data('d').id )
                            })
                        )
                })
        return $bar;
    },
    dispatchRel: function(dir) {
        var $list = this.$bar.find('.concept-bar-'+(dir>0?"after":"before"));
        if (dir>0) $list = $list.first();
        else       $list = $list.last();
        if ($list.length > 0)
            this.dispatcher.event( this.event, $list.data('d').id )
    },

    resize: function() {
        var w = this.$.width();
        var remainder = (w - this.barWidth) / 2;
        var remainderNum = parseInt(remainder / this.barWidth);
        var $before = this.$bar.find('.concept-bar-before').not('.concept-bar-excluded');
        var $after  = this.$bar.find('.concept-bar-after').not('.concept-bar-excluded');
        var that = this;
        $before.each(function(c){
            if ($before.length-c > remainderNum) {
                pos = remainderNum+1;
                $(this).removeClass('concept-bar-visible');
            }
            else {
                pos = $before.length-c;
                $(this).addClass('concept-bar-visible');
            }
            $(this).css({ 'margin-left': -that.barWidth*(pos+0.5) })
        })
        $after.each(function(c){
            if (c >= remainderNum) {
                pos = remainderNum+1;
                $(this).removeClass('concept-bar-visible');
            }
            else {
                pos = c+1;
                $(this).addClass('concept-bar-visible');
            }
            $(this).css({ 'margin-left': that.barWidth*(pos-0.5) })
        })
        // arrows
        var arrowWidth = 20;
        var showArrows = (w-this.barWidth)/2-remainderNum*this.barWidth - arrowWidth > 0;
        this.$bar.find('.concept-bars-left-angle').css({
            'margin-left': parseInt( (w-this.barWidth)/2-remainderNum*this.barWidth - arrowWidth )
        })
        this.$bar.find('.concept-bars-right-angle').css({
            'margin-left': parseInt( this.barWidth/2 + remainderNum*this.barWidth )
        })
        var show = [
            ['left', $before, showArrows?'show':'hide'],
            ['right', $after, showArrows?'show':'hide']
        ]
        show.map(function(t){
            var x = that.$bar.find('.concept-bars-'+t[0]+'-angle');
            if (t[1].length > 0) x[t[2]]();
            else                 x.hide();
        })
    },

    unselect: function(setBackground) {
        this.$bar.css({'margin-bottom': -this.$bar.height()})
        this.$bar.find('.concept-bar')
            .removeClass('concept-bar-visible concept-bar-before concept-bar-after concept-bar-current');
        this.$bar.find('.concept-bars-left-angle, .concept-bars-right-angle').hide();
    },
    select: function(id, setBackground) {
        var that = this;
        var before = true;
        this.id = id;
        this.$bar.css({'margin-bottom': 0})
        this.$bar.find('.concept-bar')
            .removeClass('concept-bar-visible concept-bar-before concept-bar-after concept-bar-current')
            .each(function(){
                var d = $(this).data('d');
                if (d.id == id) {
                    before = false;
                    $(this).addClass('concept-bar-current')
                           .css({ 'margin-left': -0.5*that.barWidth });
                } else
                if (before) $(this).addClass('concept-bar-before');
                else        $(this).addClass('concept-bar-after');
            });
        this.resize()
    },
    exclude: function(id) {
        this.data.map(function(d){ d.isExcluded = d.id == id });
        this.rebuild()
    }
}
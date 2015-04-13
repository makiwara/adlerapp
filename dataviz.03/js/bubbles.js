
function ViewBubbles($query, model, dispatcher, event) {
    var that = this;
    this.dispatcher = dispatcher;
    this.event = event;

    this.config = {
        multiplier: 1,
        marginTop: 140,
        minFontSize: 7,
        maxFontSize: 30,
        gravity: .2,
        friction: .7,
        damper:   { x: 0.2, y: 0.8 }
    };

    this.$ = $query;
    this.$.append($("<div class='concept-bubbles'>"));
    this.$wrapper = this.$.find('.concept-bubbles')
    this.chart = d3.select('.concept-bubbles');

    this.model = model;
    this.focus();

    var to;
    $(window).resize(function(){ 
        clearTimeout(to);
        to = setTimeout(function(){ that._resize(); }, 500);
    })
    // todo window.resize
}

ViewBubbles.prototype = {

    fade: function() {
        this.$wrapper.hide();
    },
    focus: function(id) {
        this.$wrapper.show();
        this.data = this.model.getConceptBubbles(id);
        this.config.multiplier = id?0.5:1;
        this._patchData()
        if (id) {
            var stripped = this.data.filter(function(x) { return x.id != id });
            this.circles = this.vis.selectAll('circle').data(stripped, function(d){ return d.id });
            this.texts   = this.textcontainer.selectAll("div").data(stripped, function(d){ return d.id });
            this.force.nodes(stripped);
            this.$wrapper.css({'margin-bottom': -this.$wrapper.height()*(1-this.config.multiplier) })
        } else {
            this.$wrapper.css({'margin-bottom': 0 })
            if (this.circles)
                this.circles = this.vis.selectAll('circle').data(this.data, function(d){ return d.id });
            if (this.texts)
                this.texts = this.textcontainer.selectAll("div").data(this.data, function(d){ return d.id });
            if (this.force)
                this.force.nodes(this.data);           
        }
        this.render();
        this._resize();
    },
    _patchData: function() {
        var w = this.$wrapper.width();
        var h = this.$wrapper.height()*this.config.multiplier;
        var that = this;
        this.data.map(function(d){
            if (!d.radius) d.radius = 2*h * d.radiusWeight;
            if (!d.x) d.x = Math.random() * (w-2*d.radius) +d.radius;
            if (!d.y) d.y = Math.random() * (h-2*d.radius) +d.radius;
            d.fontSize = that.config.minFontSize;
            d.prevFontSize = -1;
            d.frozen = false;
        })
    },

    _resize: function() {
        this.config.width = this.$wrapper.width();
        this.config.height = this.$wrapper.height()*this.config.multiplier;
        this.textcontainer
            .style('width',  this.config.width)
            .style('height', this.config.height + this.config.marginTop)
        this.vis
            .attr('width',  this.config.width)
            .attr('height', this.config.height + this.config.marginTop)
        this.force
            .stop()
            .size([this.config.width, this.config.height])
            .start()
    },

    _prepare: false,
    prepare: function(){
        if (this._prepare) return;
        this._prepare = true;
        var that = this;

        // ------ texts ----------------------------------
        this.textcontainer = this.chart.append("div")
            .style('width',  this.config.width)
            .style('height', this.config.height)
            .attr('class', 'concept-bubbles-labels')
        this.texts = this.textcontainer.selectAll("div")
            .data(this.data, function(d){ return d.id })

        // ------ circles -------------------------------
        this.vis = this.chart.append("svg")
            .attr('width',  this.config.width)
            .attr('height', this.config.height)
        this.circles = this.vis.selectAll("g")
            .data(this.data, function(d){ return d.id })

        // ------ force ---------------------------------    
        this.force = d3.layout.force()
            .nodes(this.data)
            .size([this.config.width, this.config.height])

        var that = this;
        this.force.gravity(this.config.gravity)
            .charge(function(d) { return -Math.pow(d.radius, 2)})
            .friction(this.config.friction)
            .on( "tick", function(e) {
                that.circles.each(function(d) {
                        d.x = d.x + (that.config.width/2  - d.x) * that.config.damper.x * e.alpha
                        d.y = d.y + (that.config.marginTop + (that.config.height-that.config.marginTop)/2 - d.y) * that.config.damper.y * e.alpha
                    })
                    .attr("cx", function(d){ return d.x })
                    .attr("cy", function(d){ return d.y })
                //
                that.texts.each(function(d) {
                        $(this).css({ 'font-size'  : d.fontSize })
                        var w = $(this).width();
                        var h = $(this).height();
                        d._fontSize = d.fontSize;
                        if (!d.frozen) {
                            if (w > d.radius*1.8) d.fontSize -= 2;
                            if (w < d.radius*1.8) d.fontSize += 2;
                        }
                        if (d.fontSize > that.config.maxFontSize) d.fontSize=that.config.maxFontSize;
                        if (d.prevFontSize == d.fontSize) d.frozen = true;
                        else d.prevFontSize = d._fontSize;
                        if (d.fontSize < that.config.minFontSize) $(this).hide()
                        else                                      $(this).show()
                        d.marginLeft = d.x - w/2;
                        d.marginTop  = d.y - h/2;
                        $(this).css({
                            'margin-left': d.marginLeft,
                            'margin-top' : d.marginTop,
                            'font-size'  : d.fontSize
                        })
                    })
            })

    },
    render: function() {
        this.prepare()
        var that = this;

        // ------ events ------------------------------------------
        function mouseX(e, className) {
            that.circles.each(function(d){
                if (d.id == e.id) this.className.baseVal = className
            })            
        }
        function mouseover(e) { mouseX(e, 'concept-bubbles-selected') }
        function mouseout(e)  { mouseX(e, '') }
        function click(e)     { that.dispatcher.event(that.event, e.id) }

        // ------ texts -------------------------------------------
        this.texts.enter().append("div")
            .html(function(d) { return d.title })
            .attr('class', 'concept-bubbles-label')
            .on('mouseout',  mouseout)
            .on('mouseover', mouseover)        
            .on('click',     click)
            .style('margin-left', function(d){ return d.marginLeft })
            .style('margin-top',  function(d){ return d.marginTop  })
        this.texts
            .transition().duration(500).style("font-size", function(d){ return d.fontSize })
        this.texts.exit()
            .remove()

        // ------ circles -----------------------------------------
        this.circles.enter().append("circle")
            .attr('r', 0)
            .attr('fill', function(d){ return d.color })
            .attr('id', function(d){ return d.id })
            .attr('cx', function(d){ return d.x })
            .attr('cy', function(d){ return d.y })
            .on('mouseout',  mouseout)
            .on('mouseover', mouseover)
            .on('click',     click)
        this.circles
            .transition().duration(500).attr("r", function(d){ return d.radius })
        this.circles.exit()
            .remove()

        // -------- start force! ---------------------------------
    }

}
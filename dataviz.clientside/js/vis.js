function BubbleChart($query, options) {
    this.$ = $query;
    this.config = {
        width:  1000,
        height: 800,
        center: { x: 500, y: 400 },

        minFontSize: 6,
        maxFontSize: 30,

        gravity: -0.01,
        damper:   0.05
    }


}

BubbleChart.prototype = {

    

    _isPrepared: false,
    prepare: function(){
        var that = this;
        if (this._isPrepared) return;

        var fillColor = d3.scale.category20()
      
        var textcontainer = this._chart().append("div")
            .style('width',  '100%')
            .style('height', this.config.height)
        this.texts = textcontainer.selectAll("div")
            .data(this.nodes, function(d){ return d.id })
        this.texts.enter().append("div")
            .html(function(d) { return d.title })
            .attr('class', 'bubblechart-label')
            .style({
                position: 'absolute',
                'font-family': 'Acrom, sans-serif',
                'font-weight': '700',
                'text-align' : 'center',
                'color'      : '#ffffff'
            })

        var vis = this._chart().append("svg")
            .attr('width',  '100%')
            .attr('height', this.config.height)
        this.circles = vis.selectAll("g")
            .data(this.nodes, function(d){ return d.id })
        var g = this.circles
            .enter().append("g")
        g.append("circle")
            .attr("r", 0)
            .attr("fill", function(d){ return fillColor(d.weight) })
            .attr('id', function(d){ return 'circle'+d.id })
        this.circles.select("circle")
            .transition().duration(1000).attr("r", function(d){ return d.radius })
        this.circles
            .on('click', function(e) {
                d3.select(this).each(function(d){
                    that.circles.data(
                        that.nodes.filter(function(x) { return x.id != d.id }))
                    that.texts.data(
                        that.nodes.filter(function(x) { return x.id != d.id }))
                    that.force.nodes(that.nodes.filter(function(x) { return x.id != d.id }))
                })
                that.force.stop().start();
            })

        this.circles.exit()
            .remove()
        this.texts.exit()
            .remove()

        this._isPrepared = true;
    },

    start: function(){
        this.prepare();
        this.force = d3.layout.force()
          .nodes(this.nodes)
          .size([this.config.width, this.config.height])

        var that = this;
        this.force.gravity(this.config.gravity)
            .charge(function(d) { return -Math.pow(d.radius, 2.0) / 12 })
            .friction(0.9)
            .on( "tick", function(e) {
                console.log(that.circles)
                that.circles.select("circle").each(function(d) {
                        d.x = d.x + (that.config.center.x - d.x) * (that.config.damper + 0.02) * e.alpha
                        d.y = d.y + (that.config.center.y - d.y) * (that.config.damper + 0.08) * e.alpha
                    })
                    .attr("cx", function(d){ return d.x })
                    .attr("cy", function(d){ return d.y })
                that.texts.each(function(d) {
                        if (!d.frozen)
                            $(this).css({ 'font-size'  : d.fontSize })
                        var w = $(this).width();
                        var h = $(this).height();
                        if (!d.frozen)
                            if (w > d.radius*1.8) {
                                d.frozen = true;
                                if (d.fontSize == that.config.minFontSize)
                                    $(this).hide();
                                else
                                    $(this).css({ 'font-size'  : d.fontSize-1 })
                            } else if (w < d.radius*1.75) {
                                if (d.fontSize > that.config.maxFontSize) d.frozen = true;
                                else d.fontSize += 1;
                            }
                        $(this).css({
                            'margin-left': d.x - w/2,
                            'margin-top' : d.y - h/2
                        })
                    })
            })
        this.force.start()
    },

    _chart: function(){
        var chart;
        this.$.each(function(){
            chart = d3.select(this)
        })
        return chart;
    },

    setData: function(newData) {
        var nodes = [];
        var max = 0, total = 0, i;
        for (i=0; i<newData.length; i++) {
            if (max < newData[i].weight) max = newData[i].weight;
            total += newData[i].weight/1.2;
        }
        var radiusStep = max * this.config.width / total;
        var c=0;
        for (i=0; i<newData.length; i++) {
            nodes[i] = {
                id: c++, // newData[i].original,
                weight: newData[i].weight,
                title: newData[i].original.toUpperCase().split("/").join(" ").split(" ").join("<br>"),
                radius: newData[i].weight/max * radiusStep, // TODO implement better
                x: Math.random()*this.config.width,
                y: Math.random()*this.config.height,
                fontSize: this.config.minFontSize
            }
        }
        nodes.sort(function(a,b){ return b.weight-a.weight })
        this.maxWeight = max;
        this.totalWeight = total;
        this.nodes = nodes
    }

}
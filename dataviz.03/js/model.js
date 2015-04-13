

ConceptModel = function() {

}

ConceptModel.prototype = {

    init: function(data) {
        var that = this;
        this.config = {
            getColor: function(i) {
                var c = [
                '#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', 
                '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5',
                '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f',
                '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'];
                return c[ i%c.length ];
            }
        };
        this._data = data;
        // prepare normalised weights
        this.weighten(this._data.concepts, 1);
        // prepare colors
        var c=0;
        var colors = {}
        this._data.concepts.map(function(d){ d.color = that.config.getColor(c++); colors[d.original] = d.color })
        // other concepts
        this._data.concepts.map(function(d) { 
            that.weighten(d.other_concepts, 1);
            d.other_concepts.map(function(d){
                d.color = colors[d.original]
            })
        })

    },

    weighten: function(concepts, multiplier) {
        var totalWeight = 0, maxWeight = 0;
        concepts.map(function(d) { 
            totalWeight += d.weight;
            if (d.weight > maxWeight) maxWeight = d.weight;
        })
        concepts.map(function(d) { 
            d.normWeight   = multiplier* d.weight / maxWeight; 
            d.radiusWeight = multiplier* d.weight / totalWeight;
        })
    },

    getTitle: function() {
        return this._data.meta.title;
    },
    getAuthor: function() {
        return this._data.meta.author;
    },

    getConceptBubbles: function(id) {
        var c = 0, source;
        var that = this;
        var t = this._data.concepts.filter(function(d){ return d.original === id })
        if (t.length) source = t[0].other_concepts;
        else          source = this._data.concepts;
        var result = source.map(function(d){
            return {
                id:     d.original, 
                color:  d.color,
                title:  d.original.toUpperCase().replace("/", "<br>"),
                weight: d.normWeight,
                radiusWeight: d.radiusWeight
            }
        })
        result.sort(function(a,b){ return b.weight-a.weight })
        return result;
    },

    getConceptBars: function() {
        var c = 0;
        var that = this;
        var result = this._data.concepts.map(function(d){
            return {
                id:     d.original, 
                color:  d.color,
                title:  d.original.toUpperCase(),
                weight: d.normWeight
            }
        })
        result.sort(function(a,b){ return b.weight-a.weight })
        var out = [], c = 0;
        result.map(function(d){
            if ((c++)%2) out.push(d)
            else         out.unshift(d)
        })
        return out;
    }


}
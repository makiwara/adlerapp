

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
    },

    getChapterPages: function(id) {
        var result = this._data.chapters.map(function(chapter){
            return {
                title: chapter.title.replace("—", "<br>"),
                id:    chapter.id,
                concepts: chapter.concepts.map(function(concept){
                    return {
                        id:     concept.original,
                        title:  concept.original.toUpperCase(),
                        weight: concept.weight,
                        other_concepts: concept.other_concepts.map(function(c2){
                            return {
                                id:     c2.original,
                                title:  c2.original.toUpperCase(),
                                weight: c2.weight
                            }
                        })
                    }
                })
            };
        })
        return result;
    },
    getChapterPaint: function(id) {
        var result = {};
        var paint_mode = "blocks_paint";
        var maxSize = 0;
        this._data.chapters.map(function(chapter){
            if (chapter.lines_paint) paint_mode = "lines_paint";
            result[chapter.id] = chapter[paint_mode].map(function(block){
                var result = block
                    // .filter(function(x,i){ return i < 10; })
                    .map(function(x){ return x.original })
                while (result.length < 10) result.push('');
                return result;
            });
        })
        return result;
    },

    getTexts: function(id1, id2) {
        var texts = [];
        this._data.concepts.map(function(c1){
            if (c1.original == id1) {
                if (id2) {
                    c1.other_concepts.map(function(c2){
                        if (c2.original == id2) texts = c2.texts;
                    })
                }
                else texts = c1.texts;
            }
        })
        return texts;
    }


}
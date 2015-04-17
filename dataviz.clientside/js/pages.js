function ViewPages($query, model, dispatcher, event) {
    var that = this;
    this.dispatcher = dispatcher;
    this.event = event;

    this.config = {
    };

    this.data = model.getChapterPages()
    this.paint = model.getChapterPaint()
    this.colors = {};
    model.getConceptBars().map(function(bar){ that.colors[bar.id] = bar.color; })
    
    $('<div class="concept-pages">').appendTo($query);
    this.$ = $query.find(".concept-pages")
    this.render();
    this.focus();
}

ViewPages.prototype = {

    render: function() {
        var that = this;

        this.data.map(function(chapter) {

            chapter.$ = $('<div class="concept-pages-chapter">')
                .append('<div class="concept-pages-title">')
                .append('<div class="concept-pages-lines">')
                .append('<div class="concept-pages-concepts">')

            chapter.$.find('.concept-pages-title').html(chapter.title)

            var $lines = chapter.$.find('.concept-pages-lines');
            that.paint[chapter.id].map(function(concepts, i1){
                var $line = $('<div class="concept-pages-lineblock concept-pages-lineblock-'+i1+'">');
                concepts.filter(function(d,i){ return i < 1 }).map(function(conceptId, i2){
                    $line.append($('<div class="concept-pages-line concept-pages-line-'+i1+'-'+i2+'">')
                        .css({ background: that.colors[conceptId] })
                    )
                })
                $lines.append($line);
            })

            that.$.append(chapter.$)

        })

    },

    highlight: function(id, topmost) {
        var that = this;
        if (that._bottomId) return;
        if (id) {
            this.data.map(function(chapter) {
                if (true || !that._topId) {
                    that.paint[chapter.id].map(function(concepts, i1){
                        var opacity = 0.0;
                        concepts.map(function(conceptId, i2){ 
                            if (conceptId == id) opacity = (i2 < 3)?1:0.15;
                        })
                        var prevOpacity = chapter.$.find('.concept-pages-lineblock-'+i1).css("opacity");
                        if (chapter.$.find('.concept-pages-lineblock-'+i1).data("opacity") == undefined)
                            chapter.$.find('.concept-pages-lineblock-'+i1).data("opacity", prevOpacity);
                        chapter.$.find('.concept-pages-lineblock-'+i1)
                            .css({ opacity: opacity })
                    })
                }
                if (topmost) chapter.$.find('.concept-pages-concept').each(function(){
                    $(this).css({ opacity: $(this).data('concept') == id?1:0.05 })
                })
            })
        } else {
            if (true || !that._topId) {
                this.data.map(function(chapter) {
                    that.paint[chapter.id].map(function(concepts, i1){
                        if (chapter.$.find('.concept-pages-lineblock-'+i1).data("opacity") != undefined) {
                            var backOpacity = chapter.$.find('.concept-pages-lineblock-'+i1).data("opacity");
                            chapter.$.find('.concept-pages-lineblock-'+i1).css({opacity : backOpacity})
                            chapter.$.find('.concept-pages-lineblock-'+i1).data("opacity", undefined) 
                        }
                    })
                })
                // this.$.find(".concept-pages-lineblock").css({ opacity: 1 });
            }
            this.$.find('.concept-pages-concept').css({ opacity: 1 });
        }
    },

    focus: function(topId, bottomId) {
        var that = this;
        this._topId = topId;
        this._bottomId = bottomId;

        this.data.map(function(chapter) {
            // focus concepts
            var $concepts = chapter.$.find('.concept-pages-concepts').html('')
            if (!bottomId) {
                var concept_data = chapter.concepts;
                if (topId) {
                    var t = concept_data.filter(function(d){ return d.id == topId });
                    if (t.length) concept_data = t[0].other_concepts;
                }
                concept_data.filter(function(d,i){ return (d.id != topId) && i < 7 }).map(function(concept){
                    $concepts.append(
                        $('<div class="concept-pages-concept">')
                            .html(concept.title)
                            .css({ color: that.colors[concept.id] })
                            .data('concept', concept.id)
                            .click(function(){
                                that.dispatcher.event(that.event, concept.id);
                            })
                            .mouseover(function(){ that.highlight($(this).data('concept')) })
                            .mouseout (function(){ that.highlight() })
                    )
                })
            }

            // focus lines
            var $lines = chapter.$.find('.concept-pages-lines');
            $lines.find(".concept-pages-lineblock").css({ opacity: 1 })
            that.paint[chapter.id].map(function(concepts, i1){

                if (bottomId) {
                    var opacity = 0.05;
                    var found;
                    found = [false, false];
                    concepts.map(function(conceptId, i2){ 
                        if (i2 < 3) {
                            if (conceptId == topId)    found[0] = true;
                            if (conceptId == bottomId) found[1] = true;
                        }
                    })
                    if (found[0] && found[1]) opacity = 1;
                } else
                if (topId) {
                    var opacity = 0;
                    concepts.map(function(conceptId, i2){ 
                        if (conceptId == topId) opacity = (i2 < 3)?1:0.1;
                    })
                }
                if (opacity < 1) 
                    chapter.$.find('.concept-pages-lineblock-'+i1).css({ opacity: opacity })
            })

        })

    }

}

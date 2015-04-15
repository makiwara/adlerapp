function ViewPages($query, model, dispatcher, event) {
    var that = this;
    this.dispatcher = dispatcher;
    this.event = event;

    this.config = {
    };

    this.data = model.getChapterPages()
    this.colors = {};
    model.getConceptBars().map(function(bar){ that.colors[bar.id] = bar.color; })
    
    $('<div class="concept-pages">').appendTo($query);
    this.$ = $query.find(".concept-pages")
    this.render();
}

ViewPages.prototype = {

    render: function() {
        var that = this;

        this.data.map(function(chapter) {

            var $chapter = $('<div class="concept-pages-chapter">')
                .append('<div class="concept-pages-title">')
                .append('<div class="concept-pages-lines">')
                .append('<div class="concept-pages-concepts">')

            $chapter.find('.concept-pages-title').html(chapter.title)

            var $concepts = $chapter.find('.concept-pages-concepts')

            chapter.concepts.filter(function(d,i){ return i < 6 }).map(function(concept){

                $concepts.append(
                    $('<div class="concept-pages-concept">')
                        .html(concept.title)
                        .css({ color: that.colors[concept.id] })
                )
            })


            that.$.append($chapter)

        })

    }

}

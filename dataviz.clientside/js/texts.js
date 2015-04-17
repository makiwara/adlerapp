function ViewTexts($query, model, dispatcher, event) {
    var that = this;
    this.dispatcher = dispatcher;
    this.event = event;

    this.config = {
    };

    this.model = model;
    this.concepts = {};
    model.getConceptBars().map(function(bar){ that.concepts[bar.id] = bar; })
    
    $('<div class="concept-texts">').appendTo($query);
    this.$ = $query.find(".concept-texts")
    this.render();
    this.focus();
}

ViewTexts.prototype = {

    focus: function(id1, id2, noid) {
        if (id1 == noid && id2 == noid) this.$.css({opacity: 0}); 
        else {
            this.$.css({opacity: 1}); 
            var title = this.concepts[id1].title;
            if (id2)
                title += "<span> + </span>" + this.concepts[id2].title;
            this.$.find("h2").html(title)

            var $wrapper = this.$.find(".concept-texts-wrapper").html('')
            this.model.getTexts(id1, id2).map(function(text){
                $wrapper.append(
                    $("<div class='concept-text'>")
                        .html(text.text)
                        .data('chapter', text.chapterId)
                )
            })           
        }
    },
    render: function() {
        var that = this;
        this.$.append($("<h2>"))
        this.$.append($("<div class='concept-texts-wrapper'>"))
    }

}

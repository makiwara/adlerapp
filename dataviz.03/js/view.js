

function ConceptViewAggregate($, model) {
    this.title     = new ViewTitle($, model, this, 'title');
    this.barTop    = new ViewBar($, model, this, 'top');
    this.barBottom = new ViewBar($, model, this, 'bottom');
    this.bubbles   = new ViewBubbles($, model, this, 'bubbles');
    this.pages     = new ViewPages($, model, this, 'pages');

    this.state = "overview";

    this.selectTop = function(id, unselect) {
        if (!unselect && this.topId == id) return this.selectTitle();
        this.topId = id;
        this.title.fade()
        this.barTop.select(id, 'setBackground')
        this.barBottom.exclude(id);
        this.bubbles.focus(id);
        if (unselect || this.state != "both") {
            this.state = "top";
            this.bottomId = false;
        } 
    }
    this.selectBottom = function(id, unselect) {
        if (!unselect && this.bottomId == id) return this.selectTop(this.topId);
        this.bottomId = id;
        this.bubbles.fade();
        this.barBottom.select(id);
        this.state = "both";
    }
    this.selectTitle = function() {
        this.topId = this.bottomId = false;
        this.title.focus();
        this.barTop.unselect('setBackground');
        this.barBottom.unselect();
        this.bubbles.focus();
        this.state = "overview";
    }
    this.event = function(event, data) {
        if (event == "title") this.selectTitle();
        if (event == "bubbles") {
            if (data === false) return this.selectTop(this.topId, 'unselect');
            if (this.state == "overview") this.selectTop(data);
            else                          this.selectBottom(data);
        }
        if (event == "top")    this.selectTop(data);
        if (event == "bottom") this.selectBottom(data);
    }
}

function ViewTitle($query, model, dispatcher, event) {
    this.dispatcher = dispatcher;
    this.event = event;
    this.$ = $query;
    this.title  = model.getTitle();
    this.author = model.getAuthor();
    this.render();
}
ViewTitle.prototype = {
    fade: function(){
        this.$bar.addClass('concept-title-active');
    },
    focus: function(){
        this.$bar.removeClass('concept-title-active');
    },
    render: function() {
        var that = this;
        var $bar = $('<div>').addClass('concept-title');
        $bar.append($('<h2>').html(this.author));
        $bar.append($('<h1>').html(this.title));
        $bar.click(function(){ that.dispatcher.event(that.event) })
        this.$bar = $bar;
        this.$.append($bar)
    }
}


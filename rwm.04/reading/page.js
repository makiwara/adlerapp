define([ "jquery" ],
function( $ ) { 

    /* *****************************************************************************************
     *
     *  Page class: visual display of a flipping page of a book; inside this page the book
     *              content is rendered. Page logically contains the whole book component,
     *              but displays only one ‘page’ of this component at the time.
     */
    var Page = function(reader, $containter, geom, callback, isDouble, isRight) {
        this.reader = reader;
        this.$containter = $containter;
        this.geom = geom;
        this.$page = false;
        this.$body = false;
        this.place = false;
        this.pageWidth = false;
        this.build(geom, callback);
        this.isRight  = isRight;
        this.isDouble = isDouble;
    }
    Page.prototype = {

        // move page content to show the exact given place (anywhere in the book)
        setPlace: function( newPlace ) {
            var that = this;
            // visual state: blank or text
            if (newPlace.isOverdraft())
                this.switchState('blank');
            else
                this.switchState('text');
            // replace body if needed
            if (!this.place || newPlace.getComponentNo() != this.place.getComponentNo())
            {
                var doc, styles={};
                this.$body.each(function(){ 
                    doc=this.ownerDocument; 
                    styles.body = this.style.cssText;
                })
                this.$body.parent().each(function(){ styles.html = this.style.cssText })
                doc.open('text/htmlreplace');
                doc.write(newPlace.getComponent());
                doc.close();
                $(doc.body).click(function(event) {
                    if (that.isDouble)
                        that.reader.flip(that.isRight?+1:-1);
                    else {
                        that.reader.flip((event.offsetX / that.geom.width > 0.4)?+1:-1);
                    }
                    // todo if it is only page
                    return false;
                }).on('click', 'a', function(event) {
                    return that.reader.navigate(this.href)
                }).append('<div>')
                this.updateIframeStyles(doc.body)
            }
            this.$body.css({
                          'transform': 'translateX(-'+this.pageWidth*(newPlace.getPageNo()-1)+'px)'
                       })
            delete this.place;
            this.place = newPlace;
        },

        // switch display mode of the page: text, blank, chat
        switchState: function(newState) {
            this.$page.removeClass('reader-switch-'+this.state)
                      .addClass('reader-switch-'+newState);
            this.state = newState;
        },
        // check if it is chat
        isChat: function() { return this.state=='chat' },

        // update iframe styles after rebuilding it from scratch
        updateIframeStyles: function(body) {
            var padding = parseInt(this.pageWidth/10);
            var textWidth = this.pageWidth - 2*padding;
            this.$body = $(body);
            this.$body.parent().css({
                'width': 100000000000
            })
            this.$body.css({
                'margin': 0, 
                'padding': padding,
                'width': this.pageWidth,
                'box-sizing' : 'border-box',
                'column-width': textWidth,
                'column-gap' : padding*2,
                'height' : '100%',
                'overflow' : 'hidden'
            }).addClass('reader-text-style')
        },
        // build page content: iframe, blank and chat panels
        build: function(geom, callback) {
            var that = this;
            var ready = false;
            this.$page = $("<div>").addClass('reader-page')
                                   .appendTo(this.$containter)
                                   .css({
                                        'width':  geom.width,
                                        'height': geom.height
                                   });
            this.$page.append($('<iframe>').addClass('reader-iframe').one('load', function(){
                that.pageWidth = $(this).width();
                that.updateIframeStyles(this.contentDocument.body);
                if (ready) callback(that); else ready = true;
            }).css({
                'width':  geom.width,
                'height': geom.height                
            }))
            if (ready) callback(that); else ready = true;
            this.$page.prepend($('<div>').addClass('reader-blank').css({
                'width':  geom.width,
                'height': geom.height
            }))
            this.$page.prepend($('<iframe>').addClass('reader-chat').one('load', function(){
                this.contentDocument.open('text/htmlreplace');
                this.contentDocument.write([
                    '<!DOCTYPE html><html class="reader-chat-html">',
                        '<head>',
                            '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />',
                            '<link rel="stylesheet" href="reading.css">', // TODO abstract paths
                        '</head>',
                        '<body></body>',
                    '</html>'
                ].join(''))
                this.contentDocument.close();
                that.$chat = $(this.contentDocument.body);
            }).css({
                'width':  geom.width,
                'height': geom.height                
            }))
        },

        // calculate page count for current book component
        // this method is used in reader.prescan to estimate total page count for the book
        getPageCount: function() {
            return 1 + parseInt( this.$body.children().last().offset().left / this.pageWidth )
        },
        // calculate page-wise positions of a certain markers ('a', '#p1ch2', '.CHAT')
        getAnchors: function(jQueryPath) { 
            var result = [];
            var that = this;
            this.$body.find(jQueryPath).each(function(){
                var $this = $(this);
                result[ result.length ] = {
                    $anchor : $this,
                    html    : this.outerHTML,
                    place   : that.place.copy().setPageNo(1+ parseInt( $this.offset().left / that.pageWidth ))
                }
            })
            return result;
        },
        // remove all rendered content in order to save memory
        clean: function() {
            this.$page.remove();
            delete this.$page;
            delete this.$body;
            delete this.$chat;

        }
    }
    return Page;
});
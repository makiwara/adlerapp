define([ "jquery", "reading/page", "reading/book", "reading/place", "reading/chat" ],
function( $,        Page,           Book,           Place,           Chat ) { 

    /* *****************************************************************************************
     *
     *  Reader class: main one to create and initialise the reader 
     */
    var Reader = function($host, book) {
        this.$host = $host;
        this.book = book;
        this.pages = [];
        this.place = new Place(this.book);
        this.chat  = new Chat(this);
        this.isFrozen = false;
        this._resizeTimeout = false;
        this.bind();
        this.rebuild();
    }
    Reader.prototype = {
        // ============================= RESIZE RELATED ROUTINES ==============================
        bind: function() {
            var that = this;
            $(window).resize(function(){
                if (that.isFrozen) return;
                // TODO provide smooth animation of book folding
                clearTimeout(that._resizeTimeout)
                that._resizeTimeout = setTimeout(function(){ that.resize() }, 500);
            })
        },
        resize: function() {
            this.resizeTimeout = false;
            // TODO provide smooth animation of book unfolding back
            var depth = this._resizeDepth || this.place.getComponentDepth()
            this.rebuild()
            this.flipSetup(this.place.copy().setComponentDepth(depth))
            this._resizeDepth = depth;
        },
        freeze: function()   { this.isFrozen = true  },
        unfreeze: function() { this.isFrozen = false },

        // =============== NAVIGATE TO CERTAIN CHAPTER BY URL ================================
        navigate: function(url) {
            var that = this;
            var componentNo = this.book.findComponentNoByUrl(url);
            if (componentNo >= 0) {
                setTimeout(function(){
                    var newPlace = new Place(that.book).gotoComponent(componentNo);
                    that.pages[0].setPlace(newPlace);
                    var localUrl = url.replace(/^.*(#)/, '#');
                    if (localUrl != url) {
                        var anchors = that.pages[0].getAnchors(localUrl);
                        if (anchors.length > 0) 
                            that.flipSetup(anchors[0].place)
                    } else {
                        that.flipSetup(newPlace)
                    }                
                })
                return true;
            }      
            return false;     
        },
        // =========================== PAGE FLIPPING ROUTINES ===============================
        isBeginning: function() {
            return this.pages[0].place.isBeginning();
        },
        isEnd: function() {
            return this.pages[this.pages.length-1].place.isEnd();
        },
        // Opens the book on place given
        flipSetup: function( fromPlace ) {
            this._resizeDepth = false;
            if (this.pages.length == 1) { // one-pane mode
                this.pages[0].setPlace(fromPlace);
                this.place = fromPlace;
            }
            if (this.pages.length == 2) { // two-pane mode
                this.pages[0].setPlace(fromPlace);
                if (this.chat.getChats(fromPlace).length) {
                    this.pages[1].setPlace(fromPlace);
                    this.chat.attachTo(this.pages[1]);
                } else {
                    this.pages[1].setPlace(fromPlace.copy(1));
                }
                this.place = fromPlace;
            }
        },
        // Flips the book +1/-1 page forth or back
        flip: function( dir ) {
            this._resizeDepth = false; // reset depth stored for resize
            // ---------------------------------------------------------------------------
            if (this.pages.length == 1) { // one-pane mode
                var that = this;
                var next = function(dir) {
                    var nextPlace = page.place.copy(dir);
                    if (nextPlace.isBeyond()) return true;
                    that.pages[0].setPlace(nextPlace);
                }
                var page = this.pages[0];
                if (dir >= 0) { // one-pane, flip forward ................................
                    if (this.chat.getChats(page.place).length) { // chat's here
                        if (!page.isChat()) { // just open the chat
                            this.chat.attachTo(page);
                        } else { // just flip
                            next(+1)
                        }
                    } else {
                        next(+1)
                    }
                } else { // one-pane, flip backward ......................................
                    if (this.chat.getChats(page.place).length) { // chat's open
                        if (page.isChat()) { // just hide chat
                            flip = false;
                            this.pages[0].setPlace(page.place);
                        } else { // try to flip
                            if (next(-1)) return;
                            if (this.chat.getChats(that.pages[0]).length) { 
                                // show chat first, if it's here
                                this.chat.attachTo(page);
                            }
                        }
                    } else { // no chat, just flip
                        if (next(-1))
                        if (this.chat.getChats(that.pages[0]).length) { 
                            // show chat first, if it's here
                            this.chat.attachTo(page);
                        }
                    }
                }
            }
            // ---------------------------------------------------------------------------
            // ---------------------------------------------------------------------------
            if (this.pages.length == 2) { // two pane mode
                var pageLeft  = this.pages[0];
                var pageRight = this.pages[1];
                var nextLeft, nextRight;
                var showChat = false;     
                if (dir >= 0) { // two-pane, flipping forward ............................
                    if (!pageRight.isChat() &&
                        this.chat.getChats(pageRight.place).length) { // chat's here
                        nextRight = nextLeft = pageRight.place;
                        showChat = true;
                    } else {
                        nextLeft = pageRight.place.copy(dir);
                        if (nextLeft.isBeyond()) return;
                        if (this.chat.getChats(nextLeft).length) { // chat's on left? 
                            nextRight = nextLeft;
                            showChat = true;
                        } else { // no chat on left or right 
                            nextRight = nextLeft.copy(1);
                        }
                    }
                } else { // two-pane, flipping backward ..................................
                    if (!pageRight.isChat()) { // no chat here, just flip
                        nextRight = pageLeft.place.copy(-1);
                        if (nextRight.isBeyond()) return;
                        if (this.chat.getChats(nextRight).length) { // chat's incoming!
                            nextLeft = nextRight;
                            showChat = true;
                        } else { // no chat on new pages
                            nextLeft = nextRight.copy(-1);
                        }
                    } else { // there is chat here
                        var nextLeft = pageLeft.place.copy(-2);
                        if (nextLeft.isBeyond() || this.chat.getChats(nextLeft).length) {
                            // new left pane contains chat or is empty
                            nextLeft = pageLeft.place.copy(-1);
                            if (nextLeft.isBeyond()) return;
                            nextRight = pageLeft.place;
                        } else {
                            // we can flip left
                            var nextRight = pageLeft.place.copy(-1);
                            if (this.chat.getChats(nextRight).length) {
                                // but if right page has chat, move it to the left!
                                nextLeft = nextRight;
                                showChat = true;
                            }                          
                        }
                    }
                }
                this.pages[0].setPlace(nextLeft);
                this.pages[1].setPlace(nextRight);
                if (showChat) this.chat.attachTo(pageRight);
            }
            // ---------------------------------------------------------------------------
            this.place = this.pages[0].place;
        },

        // =========================== RENDERING A BOOK ==================================
        // count pages and register chats
        prescan : function(geom) { 
            var place = new Place(this.book);
            var pageCount = 0;
            var that = this;
            var page = new Page(that, this.$container, geom, function(page){
                for (var i=0; i < that.book.getComponentCount(); i++) {
                    place.gotoComponent(i);
                    page.setPlace(place.copy());
                    var pages = page.getPageCount();
                    that.book.setPageCount(i, pages);
                    pageCount += pages;
                    that.chat.registerChatsFromPage(page);
                }
            });
            page.clean();
        },
        // calculate page geometry: paddings, no of panes, flippers, etc.
        calculateGeometry: function() {
            var geom = { 
                _proportion: [512,768],
                _minWidth:    512,
                _minHeight:   768,
                _marginHeight: 0.025,
                _minFlipperWidth: 75,
                pageCount:   1,
                padding:    [50, 50, 100, 50],
                showFlippers: true
            };
            var prop  = geom._proportion[0]/geom._proportion[1];
            var w = $(window).width();
            var h = $(window).height();
            if (w < geom._minWidth*2) {
                // small page
                geom.padding[3] = 50;
                geom.width  = w;
                geom.height = h;
                geom.showFlippers = false;
            } else {
                if (w/h >= 2*prop) {
                    // landscape: 2 pages
                    geom.pageCount = 2;
                    if (h > geom._minHeight) 
                        geom.height = h*(1 - 2*geom._marginHeight);
                    else
                        geom.height = h;
                    geom.width = h*prop;
                } else {
                    // portrait
                    if (w/h > prop) {
                        geom.width  = h*prop;
                        geom.height = h;
                    } else {
                        geom.width  = w;
                        geom.height = w/prop;
                    }
                }                
            }   
            geom.flipperWidth = ( w - geom.width*geom.pageCount ) / 2;
            if (geom.flipperWidth < geom._minFlipperWidth) geom.showFlippers = false;
            geom.marginHeight = ( h - geom.height ) / 2;
            return geom;
        },
        // rebuild the open book from scratch (used after any resize)
        rebuild: function() {
            if (!this.$container)
                this.$container = $('<div>').addClass('reader-pages').appendTo(this.$host);
            // let us count geometry and total pages in the book
            var geom = this.calculateGeometry();
            this.clean();
            this.prescan(geom);
            // build up pages
            var that = this;
            that.pages = [];
            if (geom.pageCount == 1) {
                new Page(that, that.$container, geom, function(page){
                    that.pages[0] = page;
                    that.flipSetup(that.place);
                });
            } else {
                new Page(that, that.$container, geom, function(page){
                    that.pages[0] = page;
                    new Page(that, that.$container, geom, function(page){
                        that.pages[1] = page;
                        that.flipSetup(that.place);
                    }, "isDouble", "isRight")
                }, "isDouble");
            }
            this.$container.css({ 
                'margin-left': -geom.width*geom.pageCount/2,
                'margin-top' : geom.marginHeight
            }).removeClass('reader-2pane').removeClass('reader-1pane')
              .addClass('reader-'+geom.pageCount+'pane')

            // render left-right flippers if there is a place for them
            if (geom.showFlippers) {
                $('<div>').addClass('reader-flipper reader-flipper-left')
                          .prependTo(this.$container)
                          .css({
                                'height'      : geom.height/2,
                                'padding-top' : geom.height/2,
                                'left'        : -geom.width*geom.pageCount/2-geom.flipperWidth,
                                'width'       : geom.flipperWidth
                          })
                          .html('<div></div>')
                $('<div>').addClass('reader-flipper reader-flipper-right')
                          .prependTo(this.$container)
                          .css({
                                'height'      : geom.height/2,
                                'padding-top' : geom.height/2,
                                'left'        : geom.width*geom.pageCount/2,
                                'width'       : geom.flipperWidth
                          })
                          .html('<div></div>')
                this.$flippers = this.$host.find('.reader-flipper').click(function(){
                    that.flip($(this).hasClass('reader-flipper-left')?-1:1)
                });
            }
        },
        // clean up all content rendered in order to save memory and rebuild everything afterwars
        clean: function() {
            this.chat.clean();
            for (var i=0; i < this.pages.length; i++) {
                this.pages[i].clean();
                delete this.pages[i];
            }
            this.pages = [];
            if (this.$flippers) this.$flippers.remove();
        }
    }
    return Reader;
});
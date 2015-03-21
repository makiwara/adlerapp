define([ "jquery", "reading/page", "reading/book", "reading/place", "reading/chat" ],
function( $,        Page,           Book,           Place,           Chat ) { 

    var Reader = function($host, book) {
        this.$host = $host;
        this.book = book;
        this.pages = [];
        this.place = new Place(this.book);
        this.chat  = new Chat(this);
        this.isFrozen = false;
        this._resizeTimeout = false;
        // Init ========
        this.bind();
        this.rebuild();
    }
    Reader.prototype = {
        // =============================  то, что касается ресайза ==============================
        bind: function() {
            var that = this;
            $(window).resize(function(){
                if (that.isFrozen) return;
                // TODO плавные анимации с закрытие книжки сделать
                clearTimeout(that._resizeTimeout)
                that._resizeTimeout = setTimeout(function(){ that.resize() }, 500);
            })
        },
        resize: function() {
            this.resizeTimeout = false;
            // TODO плавные анимации обратно
            var depth = /*this._resizeDepth ||*/ this.place.getComponentDepth()
            this.rebuild()
            this.flipSetup(this.place.copy().setComponentDepth(depth))
            this._resizeDepth = depth;
        },
        freeze: function()   { this.isFrozen = true  },
        unfreeze: function() { this.isFrozen = false },

        // =============== произвольное перемещение ============================
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
        // =========================== перелистывание ==========================
        isBeginning: function() {
            return this.pages[0].place.isBeginning();
        },
        isEnd: function() {
            return this.pages[this.pages.length-1].place.isEnd();
        },
        flipSetup: function( fromPlace ) {
            this._resizeDepth = false;
            if (this.pages.length == 1) { // компактный режим: только одна страница ------
                this.pages[0].setPlace(fromPlace);
                this.place = fromPlace;
            }
            if (this.pages.length == 2) { // развёрнутые две страницы --------------------
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
        flip: function( dir ) {
            this._resizeDepth = false
            // ---------------------------------------------------------------------------
            if (this.pages.length == 1) { // компактный режим: только одна страница ------
                var that = this;
                var next = function(dir) {
                    var nextPlace = page.place.copy(dir);
                    if (nextPlace.isBeyond()) return true;
                    that.pages[0].setPlace(nextPlace);
                }
                var page = this.pages[0];
                if (dir >= 0) { // движемся вперёд =======================================
                    if (this.chat.getChats(page.place).length) { // тут есть чат!
                        if (!page.isChat()) { // остаёмся там же, открываем чат
                            this.chat.attachTo(page);
                        } else { // надо листать дальше, раз просят
                            next(+1)
                        }
                    } else {
                        next(+1)
                    }
                } else { // движемся назад ===============================================
                    if (this.chat.getChats(page.place).length) { // тут есть чат!
                        if (page.isChat()) { // никуда не листаем, но уберём чат
                            flip = false;
                            this.pages[0].setPlace(page.place);
                        } else {
                            if (next(-1)) return;
                            if (this.chat.getChats(that.pages[0]).length) { // будет чат
                                this.chat.attachTo(page);
                            }
                        }
                    } else { // чата тут нет, просто листаем
                        next(-1)                       
                    }
                }
            }
            // ---------------------------------------------------------------------------
            // ---------------------------------------------------------------------------
            if (this.pages.length == 2) { // развёрнутые две страницы --------------------
                var pageLeft  = this.pages[0];
                var pageRight = this.pages[1];
                var nextLeft, nextRight;
                var showChat = false;     
                if (dir >= 0) { // движемся вперёд =======================================
                    if (!pageRight.isChat() &&
                        this.chat.getChats(pageRight.place).length) { // справа-то чат был
                        nextRight = nextLeft = pageRight.place;
                        showChat = true;
                    } else {
                        nextLeft = pageRight.place.copy(dir);
                        if (nextLeft.isBeyond()) return;
                        if (this.chat.getChats(nextLeft).length) { // в новой левой чат ..
                            nextRight = nextLeft;
                            showChat = true;
                        } else { // в новой левой нет чата, правая обычная ...............
                            nextRight = nextLeft.copy(1);
                        }
                    }
                } else { // движемся назад ===============================================
                    if (!pageRight.isChat()) { // чата на экране нет, просто листаем .....
                        nextRight = pageLeft.place.copy(-1);
                        if (nextRight.isBeyond()) return;
                        if (this.chat.getChats(nextRight).length) { // в новой есть чат!
                            nextLeft = nextRight;
                            showChat = true;
                        } else { // чата так и не будет после перелистывания
                            nextLeft = nextRight.copy(-1);
                        }
                    } else { // сейчас на экране показан чат .............................
                        var nextLeft = pageLeft.place.copy(-2);
                        if (nextLeft.isBeyond() || this.chat.getChats(nextLeft).length) {
                            // если новая левая содержит чаты или пустота
                            nextLeft = pageLeft.place.copy(-1);
                            if (nextLeft.isBeyond()) return;
                            nextRight = pageLeft.place;
                        } else {
                            // можно листнуть на левую страницу
                            var nextRight = pageLeft.place.copy(-1);
                            if (this.chat.getChats(nextRight).length) {
                                // но правая содержит чат, значит она станет левой
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

        // =========================== построение книжки =======================
        prescan : function(geom) { // count pages and register chats
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
        rebuild: function() {
            if (!this.$container)
                this.$container = $('<div>').addClass('reader-pages').appendTo(this.$host);
            // давайте считать странички
            var geom = this.calculateGeometry();
            this.clean();
            this.prescan(geom);
            // build up pages;
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
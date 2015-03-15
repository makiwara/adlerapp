define([

  'lodash',
  'RSVP',

  'constants',
  'core',
  'epubcfi',
  'replace',
  'utils'

], function(_, RSVP, constants, Core, EpubCFI, replace, utils) {

    var DEBUG = false;

    var Renderer = function(book) {
      this.area = book.area;
      this.book = book;
      this.firstScroll = false;
      this.caches = {};

      this.listeners = {
        handleMouseDown: function(e) {
          if (this.book.settings.spreads) {
            if (e.button == 0) {
              this.backInterval = setInterval(function() {
                this.curPage();
              }.bind(this), 10);
            }
          }
        }.bind(this),
        handleMouseUp: function(e) {
          clearInterval(this.backInterval);
          this.curPage();
        }.bind(this),
        handleScroll: function() {
          if (this.book.settings.fixedLayout) {
            this.book.trigger('checkBookmarkVisibility');

            if (!this.firstScrollPassed) {
              this.firstScrollPassed = true;
              return;
            }
            this.currentLocationCfi = this.getPageCfi();
            this.book.setSettings({
              position: this.currentLocationCfi
            });
          }
        }.bind(this),
        handleOnload: function(promise) {
          if (this.book.settings.format == 'fb2') {
            var newDom = this.adjustContainer();
            this.win = this.iframe.contentWindow;
            this.doc = this.iframe.contentDocument;
            this.docEl = this.doc.documentElement;
            this.bodyEl = this.doc.querySelector('#fb2-body');
          } else {
            this.doc = this.iframe.contentDocument;
            this.docEl = this.doc.documentElement;
            this.win = this.iframe.contentWindow;
            this.bodyEl = this.doc.body;
          }

          this.applyStyles();
          this.onModeChanged();
        
          if (this.book.settings.fixedLayout) {
            this.fixedLayout();
          } else {
            this.formatSpread();
          }

          // Trigger registered hooks before displaying.
          this.beforeDisplay(function() {
            this.progressOutdated = true;
            this.calcPages();

            this.currentLocationCfi = this.getPageCfi();

            this.trigger('render:chapterDisplayed', this.currentChapter);
            this.book.trigger('render:chapterDisplayed', this.currentChapter);
            this.book.trigger('frameReady');

            this.doc.onmousewheel = function(e) {
              if (!this.book.settings.fixedLayout) {
                return;
              }

              if (this.blockScroll) {
                e.preventDefault();
                return;
              }

              this.setPadding();

              if (e.wheelDelta < 0) {  // If in bottom.
                this.scrollDown();
              } else if (e.wheelDelta > 0) {  // If in top.
                this.scrollUp();
              }
            }.bind(this);

            setTimeout(function() {
              promise.resolve(this);
              this.visible(true);
              this.calcPages();
            }.bind(this), 500);

          }.bind(this));
        }.bind(this)
      };

      this.epubcfi = new EpubCFI();
        
      this.initialize();
      this.addListeners();
      this.reformatStarted = false;
    };

    Renderer.prototype.initialize = function() {
      this.iframe = document.createElement('iframe');

      this.resizeIframe();

      this.area.appendChild(this.iframe);
    };

    Renderer.prototype.scrollDown = function() {
      if (this.win.innerHeight + this.win.scrollY >=
          this.doc.body.clientHeight) {
        this.delayScroll_(this.book.nextChapter.bind(this.book));
      } else {
        this.scrollEnabled = false;
      }
    };

    Renderer.prototype.scrollUp = function() {
      if (this.win.scrollY === 0) {
        this.delayScroll_(this.book.prevChapter.bind(this.book));
      } else {
        this.scrollEnabled = false;
      }
    };

    Renderer.prototype.delayScroll_ = function(callback) {
      if (this.book.settings.format == 'fb2') {
        return;
      }

      if (this.scrollDelayed) {
        return;
      }

      if (this.scrollEnabled) {
        callback();
        this.scrollPadding = false;
        this.scrollEnabled = false;
        this.blockScroll = true;
        _.delay(function() {
          this.blockScroll = false;
        }.bind(this), 1000);

        return;
      }

      this.scrollDelayed = true;

      _.delay(function() {
        this.scrollEnabled = true;
        this.scrollDelayed = false;
      }.bind(this), constants.SCROLL_DELAY);

      return;
    };

    Renderer.prototype.setPadding = function() {
      if (!this.scrollPadding) {
        this.scrollPadding = true;
        this.bodyEl.style.paddingBottom = this.win.innerHeight / 2
            + 'px';
      }
    };

    // Listeners for browser events.
    Renderer.prototype.addListeners = function() {
      window.addEventListener('resize', this.onResized.bind(this), false);
      this.book.on('render:layoutChange', function() {
        this.changeLayout();
        this.onResized();
        this.onModeChanged();
      }.bind(this));

      this.book.on('render:pageZoom', function() {
        this.updateLayout();
        this.reformat();
      }.bind(this));

      this.book.registerHook('beforeChapterDisplay', [
        this.replaceLinks.bind(this),
        replace.head,
        replace.resources,
        replace.svg,
        replace.lang
      ], true);
    };

    Renderer.prototype.chapter = function(chapter) {
      var renderer = this;
      var store = false;

      if (this.book.settings.contained) {
        store = this.book.zip;
      }

      if (this.currentChapter) {
        this.currentChapter.unload();

        this.trigger('render:chapterUnloaded');
        this.book.trigger('render:chapterUnloaded');
      }

      this.currentChapter = chapter;
      this.chapterPos = 1;
      this.pageIds = {};
      this.leftPos = 0;

      this.currentChapterCfi = this.epubcfi.generateChapter(this.book.spineNodeIndex, chapter.spinePos, chapter.id);
      this.visibileEl = false;

      return chapter.url(store).then(function(url) {
        return renderer.setIframeSrc(url);
      });
    };

    Renderer.prototype.onResized = function() {
      this.resizeIframe();
      this.updateLayout();
      this.reformat();
    };

    Renderer.prototype.onModeChanged = function() {
      if (this.book.settings.fixedLayout) {
        this.doc.addEventListener('scroll', this.listeners.handleScroll, false);
        this.doc.removeEventListener('mouseup', this.listeners.handleMouseUp);
        this.doc.removeEventListener('mousedown', this.listeners.handleMouseDown);
      } else {
        this.doc.removeEventListener('scroll', this.listeners.handleScroll);
        this.doc.addEventListener('mouseup', this.listeners.handleMouseUp, false);
        this.doc.addEventListener('mousedown', this.listeners.handleMouseDown, false);
      }
    };

    Renderer.prototype.changeLayout = function() {
      if (this.book.settings.fixedLayout) {
        this.formatSpread();
        this.firstScrollPassed = false;
      } else {
        this.fixedLayout();
      }
    };

    Renderer.prototype.updateLayout = function() {
      if (this.book.settings.fixedLayout) {
        this.fixedLayout();
      } else {
        this.formatSpread();
      }
    };

    Renderer.prototype.reformat = function() {
      var promise = new RSVP.Promise();

      DEBUG && console.log('Book was reformatted');
      
      // Re-calc number of pages.
      this.calcPages();
      this.progressOutdated = true;
      
      // Go to current page after resize.
      this.gotoLastPosition();

      return promise;
    };

    Renderer.prototype.resizeIframe = function() {
      var width = this.area.clientWidth;
      var height = this.area.clientHeight;

      this.iframe.height = height;

      if (width % 2 != 0) {
        width += 1; // Prevent cutting off edges of text in columns.
      }

      this.iframe.width = width;
    };

    Renderer.prototype.adjustContainer = function() {
      var content = this.book.contents.formatted;

      var request = new window.XMLHttpRequest();  
        
      request.open('GET', '../css/fb2reader.css', false);
      request.send();

      var cssText = '<style type="text/css">' + request.responseText +
          '</style>';

      var html = document.createElementNS('http://www.w3.org/1999/xhtml',
          'html');
      var body = document.createElementNS('http://www.w3.org/1999/xhtml',
          'body');
        
      body.setAttribute('id', 'fb2-body');
      body.appendChild(content);

      html.innerHTML = cssText;
      html.appendChild(body);

      this.iframe.contentDocument.removeChild(
          this.iframe.contentDocument.firstChild);
      this.iframe.contentDocument.appendChild(html);
    };

    Renderer.prototype.setIframeSrc = function(url) {
      var promise = new RSVP.Promise();

      this.visible(false);

      this.iframe.contentWindow.location.replace(url);

      this.iframe.onload = this.listeners.handleOnload.bind(null, promise);
      
      return promise;
    };

    Renderer.prototype.formatSpread = function() {
      this.book.settings.spreads = true;
      this.book.settings.fixedLayout = false;

      var gap = constants.COLUMN_GAP_PX;
      var fontSize = this.book.settings.fontSize ||
          constants.DEFAULT_FONT_SIZE_PX;
      var minWidth = fontSize * constants.MIN_BOOK_WIDTH_EM + gap;
      var colCount = this.win.innerWidth < minWidth ? 1 : 2;

      if (this.iframe.width %2 != 0) {
        this.iframe.width++;
      }

      this.elWidth = this.iframe.width;

      this.spread = true; // Double Page.

      this.colWidth = (this.elWidth - gap * (colCount - 1)) / colCount;

      this.spreadWidth = (this.colWidth + gap * (colCount - 1)) * colCount;

      this.docEl.style.overflow = 'hidden';

      this.docEl.style.width = this.elWidth + 'px';

      // Adjust height.
      this.docEl.style.height = this.iframe.height  + 'px';

      // Add columns.
      this.docEl.style.webkitColumnAxis = 'horizontal';
      this.docEl.style.webkitColumnGap = gap * (colCount - 1) + 'px';
      this.docEl.style.webkitColumnWidth = this.colWidth + 'px';
      this.docEl.style.webkitColumnCount = colCount;
    };

    Renderer.prototype.fixedLayout = function() {
      this.book.settings.spreads = false;
      this.book.settings.fixedLayout = true;

      this.leftPos = 0;

      this.paginated = false;

      // Adjust height.
      this.docEl.style.height = 'auto';
      this.docEl.style.width = '';

      // Scroll.
      this.docEl.style.overflow = 'auto';

      this.docEl.style.webkitColumnAxis = '';
      this.docEl.style.webkitColumnGap = '';
      this.docEl.style.webkitColumnWidth = '';
      this.docEl.style.webkitColumnCount = '';
    };

    Renderer.prototype.setStyle = function(style, val, bodyEl) {
      bodyEl = bodyEl || this.bodyEl;

      if (bodyEl) {
        bodyEl.style[style] = val;
      }
    };

    Renderer.prototype.removeStyle = function(style, bodyEl) {
      bodyEl = bodyEl || this.bodyEl;

      if (this.bodyEl) {
        bodyEl.style[style] = '';
      }
    };

    Renderer.prototype.applyStyles = function(bodyEl) {
      bodyEl = bodyEl || this.bodyEl;

      var styles = this.book.settings.styles;

      for (style in styles) {
        this.setStyle(style, styles[style], bodyEl);
      }
    };

    Renderer.prototype.gotoLastPosition = function() {
      if (this.currentLocationCfi) {
        this.gotoCfiFragment(this.currentLocationCfi);
      }
    };

    Renderer.prototype.gotoChapterEnd = function() {
      this.chapterEnd();
    };

    Renderer.prototype.gotoBookmark = function(cfi) {
      var promise = new RSVP.Promise();
      var chapter = this.epubcfi.parse(cfi);

      this.book.displayChapter(chapter.spinePos).then(function() {
        this.gotoCfiFragment(cfi);
        promise.resolve(this.currentLocationCfi);
      }.bind(this));

      return promise;
    };

    Renderer.prototype.visible = function(bool) {
      if (typeof(bool) == 'undefined') {
        return this.iframe.style.visibility;
      }

      if (bool == true) {
        this.iframe.style.visibility = 'visible';
      } else {
        if(bool == false){
          this.iframe.style.visibility = 'hidden';
        }
      }
    };

    Renderer.prototype.calcPages = function() {
      this.totalWidth = this.docEl.scrollWidth;
      
      this.displayedPages = Math.ceil(this.totalWidth / this.spreadWidth);

      this.currentChapter.pages = this.displayedPages;
    };


    Renderer.prototype.nextPage = function() {
      if (this.chapterPos < this.displayedPages) {
        this.chapterPos++;
        this.currentPage++;
        this.page(this.chapterPos);
        return this.chapterPos;
      } else {
        return false;
      }
    };

    Renderer.prototype.prevPage = function() {
      if (this.chapterPos > 1) {
        this.chapterPos--;
        this.currentPage--;
        this.page(this.chapterPos);
        return this.chapterPos;
      } else {
        return false;
      }
    };

    Renderer.prototype.curPage = function() {
      this.page(this.chapterPos);
      return this.chapterPos;
    };

    Renderer.prototype.chapterEnd = function() {
      this.page(this.displayedPages);
    };

    Renderer.prototype.setLeft = function(leftPos) {
      this.doc.defaultView.scrollTo(leftPos, 0);
    };

    Renderer.prototype.replace = function(query, func, finished, progress) {
      var items = this.doc.querySelectorAll(query);
      var resources = Array.prototype.slice.call(items);
      var count = resources.length;
      var after = function(result) {
        count--;
        if (progress) {
          progress(result, count);
        }

        if (count <= 0 && finished) {
          finished(true);
        }
      };
        
      if (count === 0) {
        finished(false); 
        return;
      }

      resources.forEach(function(item) {
        func(item, after);
      }.bind(this));
    };

    Renderer.prototype.replaceWithStored =
        function(query, attr, func, callback) {
      var _oldUrls;
      var _newUrls = {};
      var _store = this.book.zip;
      var _cache = this.caches[query];
      var _contentsPath = this.book.settings.contentsPath || '';
      var _attr = attr;
      var progress = function(url, full, count) {
          _newUrls[full] = url;
      };
      var finished = function(notempty) {
        if (callback) {
          callback();
        }

        _.each(_oldUrls, function(url) {
          _store.revokeUrl(url);
        });

        _cache = _newUrls;
      };

      if (!_store) {
        return;
      }

      if (!_cache) {
        _cache = {};
      }

      _oldUrls = _.clone(_cache);

      this.replace(query, function(link, done) {

        var src = link.getAttribute(_attr);
        var full = Core.resolveUrl(_contentsPath, src);
        var replaceUrl = function(url) {
          link.setAttribute(_attr, url);
          link.onload = function(){
            done(url, full);
          }
        };

        if (full in _oldUrls) {
          replaceUrl(_oldUrls[full]);
          _newUrls[full] = _oldUrls[full];
          delete _oldUrls[full];
        } else {
          func(_store, full, replaceUrl, link);
        }

      }, finished, progress);
    };

    Renderer.prototype.replaceLinks = function(callback) {

      var renderer = this;

      this.replace('a[href]', function(link, done) {
        var href = link.getAttribute('href');
        var relative = href.search('://');
        var fragment = href[0] == '#';

        if (relative != -1) {

          link.setAttribute('target', '_blank');

        } else {
          link.onclick = function() {
            renderer.book.goto(href);
            return false;
          }
        }

        done();

      }, callback);
    };

    Renderer.prototype.page = function(pg) {
      if (pg >= 1 && pg <= this.displayedPages) {
        this.chapterPos = pg;
        this.leftPos = this.spreadWidth * (pg-1); // Pages start at 1.
        this.setLeft(this.leftPos);
        this.currentLocationCfi = this.getPageCfi();
        this.book.trigger('render:pageChanged');

        return true;
      }

      return false;
    };

    Renderer.prototype.section = function(fragment) {
      var el = this.doc.getElementById(fragment);
      var left;
      var pg;

      if (el) {
        this.pageByElement(el);
      }
    };

    Renderer.prototype.pageByElement = function(el) {
      if (this.book.settings.spreads) {
        var left, pg;
        if (!el) {
          return;
        }
        var elementLeftOffset = el.getBoundingClientRect().left;
        left = this.leftPos + elementLeftOffset;
        pg = Math.floor(left / this.spreadWidth) + 1;
        this.page(pg);
      } else {
        this.bodyEl.scrollTop = el.offsetTop - 1;
      }
    };

    Renderer.prototype.getProgress = function(callback) {
      if (this.progressUpdateRunning) {
        return;
      }

      if (this.book.settings.format == 'epub') {
        if (this.isProgressCached()) {
          callback(this.currentPage, this.totalPages);
          return;
        }

        this.progressUpdateRunning = true;
        this.calcAllEpubPages(function(totalPages) {
          this.calcCurrentEpubPage(function(currentPage) {
            this.progressUpdateRunning = false;
            this.cacheProgress(currentPage, totalPages, callback);
          }.bind(this));
        }.bind(this));
      } else {
        this.calcPages();
        this.cacheProgress(this.chapterPos, this.displayedPages, callback);
      }
    };

    Renderer.prototype.cacheProgress = function(currentPage, totalPages,
          callback) {
      this.currentPage = currentPage;
      this.totalPages = totalPages;
      this.progressOutdated = false;
      callback(currentPage, totalPages);
    };

    Renderer.prototype.isProgressCached = function() {
      return (this.currentPage && this.totalPages && !this.progressOutdated);
    };

    Renderer.prototype.beforeDisplay = function(callback) {
      this.book.triggerHooks('beforeChapterDisplay', callback.bind(this), this);
    };

    Renderer.prototype.walk = function(node, global) {
      var r;
      var node;
      var children;
      var leng;
      var startNode = node;
      var prevNode;
      var stack = [startNode];
      var invalidTags;

      while (!r && stack.length) {

        node = stack.shift();

        if (this.book.settings.format == 'fb2') {
          invalidTags = {
            'br': 1, 'navmap': 1, 'navpoint': 1, 'h1': 1, 'h2': 1, 'h3': 1,
            'h4': 1, 'h5': 1
          };
        } else {
          invalidTags = {
            'br': 1
          };
        }

        if (node.tagName in invalidTags) {
          continue;
        }

        if (this.isElementVisible(node) && node.childElementCount == 0) {
          r = node;
        }

        if (!r && node && node.childElementCount > 0) {
          children = node.children || [];
          leng = children.length;

          for (var i = 0; i < leng; i++) {
            if (children[i] != prevNode) {
              stack.push(children[i]);
            }
          }
        }

        if (!r && stack.length == 0 && startNode &&
            startNode.parentNode !== null) {
          stack.push(startNode.parentNode);
          prevNode = startNode;
          startNode = startNode.parentNode;
        }
      }

      if (!r && !global) {
        return this.walk(this.bodyEl, true);
      }

      return r;
    };

    Renderer.prototype.getPageCfi = function() {
      var prevEl = this.visibileEl;
      this.visibileEl = this.findFirstVisible(prevEl);

      if (!this.visibileEl.id) {
        this.visibileEl.id = 'EPUBJS-PAGE-' + this.chapterPos;
      }

      this.pageIds[this.chapterPos] = this.visibileEl.id;
      
      return this.epubcfi.generateFragment(this.visibileEl,
          this.currentChapterCfi);
    };

    Renderer.prototype.gotoCfiFragment = function(cfi) {
      var element = this.findElementByCfi(cfi);
      if (!element) {
        return;
      }

      this.pageByElement(element);
    };

    Renderer.prototype.findElementByCfi = function(cfi) {
      var parsedCfi;

      if (_.isString(cfi)) {
        parsedCfi = this.epubcfi.parse(cfi);

        if (_.contains(this.currentChapterCfi, parsedCfi.chapter)) {
          return this.epubcfi.getElement(parsedCfi, this.doc);
        }
      }
      return false;
    };

    Renderer.prototype.findFirstVisible = function(startEl) {
      var el = this.bodyEl.firstElementChild;
      var found;
      
      found = this.walk(el);

      if (found) {
        return found;
      } else {
        return startEl;
      }
    };

    Renderer.prototype.isElementVisible = function(el) {
      var left;
      var top;
      
      if (this.book.settings.spreads) {
        if (el && typeof el.getBoundingClientRect === 'function') {

          left = el.getBoundingClientRect().left;
          top = el.getBoundingClientRect().top;
          
          if (left >= 0 && left < this.spreadWidth && top >= 0) {
            return true;  
          }
        }
      } else {
        var visibleArea = this.bodyEl.scrollTop + this.docEl.clientHeight;
        if (el.offsetTop > this.bodyEl.scrollTop && el.offsetTop < visibleArea) {
          return true;
        }
      }

      return false;
    };

    Renderer.prototype.isBookmarkVisible = function(cfi) {
      var element = this.findElementByCfi(cfi);
      if (!element) {
        return false;
      }

      return this.isElementVisible(element);
    };


    Renderer.prototype.height = function(el) {
      return this.docEl.offsetHeight;
    };

    Renderer.prototype.remove = function() {
      window.removeEventListener('resize', this.resized);
      this.area.removeChild(this.iframe);
    };

    Renderer.prototype.calcEpubPages_ = function(endChapter, callback) {
      if (endChapter < 0) {
        callback(0);
        return;
      }

      var store = this.book.zip;
      var chapterArray = this.book.contents.spine;
      var chapterProcessed = 0;
      var pagesCount = 0;
      var docEl = this.docEl;
      var hiddenIframe = this.iframe.cloneNode(true);
      document.body.appendChild(hiddenIframe);

      function calcPages() {
        pagesCount += Math.ceil(
            hiddenIframe.contentDocument.documentElement.scrollWidth /
                book.render.spreadWidth);
      }

      var hiddenIframeInit = _.once(function() {
        var hiddenDocEl = hiddenIframe.contentDocument.documentElement;
        hiddenDocEl.classList.add('spread-style');
        hiddenDocEl.replaceChild(docEl.firstElementChild.cloneNode(true),
            hiddenDocEl.firstElementChild);
        hiddenDocEl.setAttribute('style', docEl.getAttribute('style'));
      });

      var processChapter = function() {
        hiddenIframeInit();
        utils.makeHyphens(hiddenIframe.contentDocument.documentElement);
        this.applyStyles(hiddenIframe.contentDocument.body);
        calcPages();
        if (chapterProcessed != endChapter) {
          chapterProcessed++;
          loadContentToIframe(chapterProcessed);
        } else {
          document.body.removeChild(hiddenIframe);
          callback(pagesCount);
        }
      }.bind(this);

      hiddenIframe.onload = processChapter;

      function loadContentToIframe(chapter, isInit) {
        store.getUrl(chapterArray[chapter].href).then(function(blobUrl) {
          if (isInit) {
            hiddenIframe.src = blobUrl;
            return;
          }

          var xhr = new XMLHttpRequest();
          xhr.open('GET', blobUrl);
          xhr.onload = function() {
            var response = this.responseXML;

            if (!response) {
              var parser = new DOMParser();
              response = parser.parseFromString(this.response,
                  'application/xhtml+xml');
            }

            var newBody = response.body.cloneNode(true);
            var oldBody = hiddenIframe.contentDocument.body;
            hiddenIframe.contentDocument.documentElement.replaceChild(newBody,
                oldBody);
            processChapter();
          };
          xhr.send();
        });
      }
      loadContentToIframe(chapterProcessed, true);
    };

    Renderer.prototype.calcAllEpubPages = function(callback) {
      this.calcEpubPages_(this.book.contents.spine.length - 1, callback);
    };

    Renderer.prototype.calcCurrentEpubPage = function(callback) {
      var currentChapter = this.book.render.currentChapter.spinePos - 1;
      this.calcEpubPages_(currentChapter, function(pageNumber) {
        callback(pageNumber + this.chapterPos);
      }.bind(this));
    };

    // Enable binding events to parser.
    RSVP.EventTarget.mixin(Renderer.prototype);


    // Export.
    return Renderer;

});
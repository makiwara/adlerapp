define([

  'lodash',

  'book',
  'constants',
  'statistics'

], function(_, JSBook, constants, statistics) {

    var Book;
    var handleZoomIn = handleZoom.bind(null, 'in');
    var handleZoomOut = handleZoom.bind(null, 'out');
    var handleZoomDefault = handleZoom.bind(null, 'normal');
    var menuIsVisible = new RSVP.Promise();

    function handleKeydown(e) {
      var zoomInCodes = [187, 107],
        zoomOutCodes = [189, 109],
        zoomDefaultCodes = [48, 96],
        nextPageCodes = [34, 39, 32, 40],
        prevPageCodes = [33, 37, 38],
        key = e.keyCode;

      if (e.metaKey || e.ctrlKey) {
        switch (true) {
          case _.contains(zoomInCodes, key):
            handleZoomIn(e);
            break;
          case _.contains(zoomOutCodes, key):
            handleZoomOut(e);
            break;
          case _.contains(zoomDefaultCodes, key):
            handleZoomDefault(e);
            break;
        }
      }

      if (book.settings.coverMode || book.settings.coverMode == undefined) {
         _.contains(nextPageCodes, key) && toggleCoverBook();
      } else if (book.settings.spreads) {
        switch (true) {
          case _.contains(prevPageCodes, key):
            handlePrevPage();
            break;
          case _.contains(nextPageCodes, key):
            handleNextPage();
            break;
        }
      } else if (book.settings.fixedLayout) {
        switch (true) {
          case _.contains(prevPageCodes, key):
            _.delay(function() {
              book.render.setPadding();
              book.render.scrollUp();
            }, 500);
            break;
          case _.contains(nextPageCodes, key):
            _.delay(function() {
              book.render.setPadding();
              book.render.scrollDown();
            }, 500);
            break;
        }
      }

      book.render.iframe.focus();
    }

    function meta(meta) {
      var bookFooter = document.querySelector('.publisher');
      var bookTitle = document.querySelector('#book-title');
      var chapterTitle = document.querySelector('#chapter-title');
      var cover = document.querySelector('.cover');
      var coverAuthor = document.querySelector('.author');
      var coverImage = document.querySelector('.cover');
      var coverTitle = document.querySelector('.title');
      var tocBookTitle = document.querySelector('.book-title');
      var tocBookAuthor = document.querySelector('.book-author');

      var author = meta.creator;
      var title = meta.bookTitle;
      var publisher = meta.publisher;
      var year = meta.year ? meta.year.match(/\d{4}/)[0] : '';

      var footer = publisher + ' ' + year;

      coverTitle.innerHTML = title;
      coverAuthor.innerHTML = author;
      bookTitle.innerHTML = title;
      chapterTitle.innerHTML = author;
      bookFooter.innerHTML = footer;
      tocBookAuthor.innerHTML = author;
      tocBookTitle.innerHTML = title;

      document.title = title;

      var style = cover.style;
      style['-webkit-transition-duration'] = '500ms';
      style['-webkit-transition-property'] = 'opacity';
      style['opacity'] = '1';
    }

    function toc(contents) {
      var TOCButton = document.querySelector('.trigger-contents');
      var bookmarkButton = document.querySelector('.trigger-bookmarks');

      if (_.isEmpty(contents)) {
        TOCButton.style.display = 'none';
        handleTriggerClick({
          srcElement: bookmarkButton
        });
        return;
      }

      var tocContainer = document.querySelector('.contents-table');
      var toc = document.querySelector('.contents-container');
      var cover = document.querySelector('.book-cover');
      var links;
      var items;

      toc.innerHTML = '';
      // Recursively generate TOC levels.
      items = generateTocItems(contents, 1);
     
      toc.appendChild(items);

      var handleLinkClick = function(e) {
        var url = this.getAttribute('data-url');

        toggleToc();
        setBookmarkView('inactive');
        Book.goto(url).then(checkBookmarkVisibility);
        e.preventDefault();
      }
      
      var links = document.querySelectorAll('.contents-item-title');
      var linksArray = Array.prototype.slice.call(links);
      linksArray.forEach(function(link) {
        link.addEventListener('click', handleLinkClick.bind(link), false);
      });
    }

    function generateBookmarks() {
      var bookmarksContainer = document.querySelector('.bookmarks-container');
      var bookmarksPlaceholder = document.querySelector(
          '.bookmarks-placeholder');
      var bookmarkItem;

      var oldBookmarks = bookmarksContainer.querySelectorAll('.bookmark-item');
      _.forEach(oldBookmarks, function(element) {
        bookmarksContainer.removeChild(element);
      });
      bookmarksPlaceholder.style.display = '';

      if (!_.isEmpty(book.bookmarks)) {
        bookmarksPlaceholder.style.display = 'none';
      }

      _.forEach(book.bookmarks, function(bookmark) {
        bookmarkItem = document.createElement('div');
        bookmarkItem.classList.add('bookmark-item');
        bookmarkItem.innerText = bookmark.title;
        bookmarkItem.addEventListener('click', function() {
          history.replaceState({cfi: book.render.currentLocationCfi});
          book.render.gotoBookmark(bookmark.cfi).then(function(cfi) {
            history.pushState({cfi: cfi});
          });
          toggleToc();
        }, false);

        bookmarksContainer.appendChild(bookmarkItem);
      });
    }

    function setBookmarkView(state) {
      var bookmark = document.querySelector('.bookmark');
      if (state == 'active') {
        bookmark.classList.add('bookmark-active');
        bookmark.setAttribute('title',
            loadTimeData.getString('tooltipMessageBookmarkActive'));
      } else {
        bookmark.classList.remove('bookmark-active');
        bookmark.setAttribute('title',
            loadTimeData.getString('tooltipMessageBookmarkInactive'));
      }
    }

    function checkBookmarkVisibility() {
      var bookmarkButton = document.querySelector('.bookmark');
      setBookmarkView('inactive');
      _.forEach(book.bookmarks, function(bookmark, key) {
        if (book.render.isBookmarkVisible(bookmark.cfi)) {
          setBookmarkView('active');
        }
      });
    }

    function handlePrevPage() {
      if (Book.isChapterFirst() && Book.isPageFirst()) {
        toggleCoverBook();
      }

      Book.prevPage();

      if (book.settings.coverMode) {
        book.setSettings({
          position: ''
        });
      }
    };

    function handleNextPage() {
      var next = document.querySelector('.right-arrow');

      Book.nextPage();

      if (Book.isChapterLast() && Book.isPageLast()) {
        next.style.display = 'none';
      }
    }

    function handlePageChanged() {
      var next = document.querySelector('.right-arrow');
      next.style.display = '';
      book.setSettings({
        position: book.render.currentLocationCfi
      });

      updateProgress();
      checkBookmarkVisibility();
    }

    function handleFrameReady() {
      var loader = document.querySelector('.loader-container');
      var startReading = document.querySelector('.start-reading');

      if (book.settings.fixedLayout) {
        switchMode('single');
      } else {
        switchMode('spread');
      }
      loader.style.display = 'none';
      startReading.style.display = 'block';
      updateProgress();
      book.restoreSettings(generateBookmarks);
      book.render.iframe.tabIndex = 1;
      book.render.iframe.focus();

      if (book.render.keyListener_) {
        book.render.doc.removeEventListener('keydown',
            book.render.keyListener_);
      }

      // BROWSER-26559: Dirty hack. Sometimes keyboard events handlers don't
      // fire in their scope in iframe.
      book.render.keyListener_ = handleKeydown.bind(null);
      book.render.doc.addEventListener('keydown', book.render.keyListener_);
    }

    function updateProgress() {
      var progress = document.querySelector('#progressbar');
      var loader = document.querySelector('.progress-loader');
      loader.classList.remove('hidden-element');
      progress.classList.add('hidden-element');
      Book.render.getProgress(function(currentPage, totalPages) {
        progress.innerText = loadTimeData.getStringF('pageNumber', currentPage,
            totalPages);
        loader.classList.add('hidden-element');
        progress.classList.remove('hidden-element');
      });
    }
    
    function generateTocItems(contents, level) {
      var type = (level == 1) ? 'chapter' : 'section';
      var wrapper = document.createElement('div');

      contents.forEach(function(content) {
        var subitems;
        wrapper.classList.add('contents-item');
        wrapper.setAttribute('id', 'toc-' + content.id);

        var item = document.createElement('span');
        item.classList.add('contents-item-title', type);
        item.setAttribute('href', '#/' + content.href);
        item.setAttribute('data-url', content.href);
        item.innerHTML = content.label;

        wrapper.appendChild(item);

        if (content.subitems && content.subitems.length) {
          level++;
          subitems = generateTocItems(content.subitems, level);
          wrapper.appendChild(subitems);
        }
      });

      return wrapper;
    }
    
    function bookReady() {
      window.addEventListener('keydown', handleKeydown, false);
      controls();
    }

    function switchMode(mode) {
      var iframeInner = book.render.docEl;
      var iframeElement = book.render.iframe;
      var main = document.querySelector('#main');
      if (mode == 'single') {
        main.classList.add('single-mode');
        iframeInner.classList.add('single-style');
        iframeInner.classList.remove('spread-style');
      } else {
        main.classList.remove('single-mode');
        iframeInner.classList.add('spread-style');
        iframeInner.classList.remove('single-style');
      }
      book.setSettings({
        view: mode
      });
    }

    function storeMenuState(state) {
      chrome.storage.local.set({isMenuOpened: state});
    }

    function getMenuState(callback) {
      chrome.storage.local.get('isMenuOpened', function(state) {
        callback(state.isMenuOpened);
      });
    }

    function toggleCoverBook() {
      var cover = document.querySelector('.book-cover');
      if (book.settings.coverMode === false) {
        cover.style.display = 'block';
        book.settings.coverMode = true;
        _.delay(scaleCover, 1);
      } else {
        cover.style.display = 'none';
        book.settings.coverMode = false;
      }
      menuIsVisible.resolve();
    }

    function scaleCover() {
      var img = document.querySelector('.cover');
      var scale = img.height / img.naturalHeight;
      img.width = img.naturalWidth * scale;
    }

    window.addEventListener('resize', scaleCover, false);

    function toggleToc(e) {
      var toc = document.querySelector('.contents-table');
      var tocStyle = window.getComputedStyle(toc);
      if (tocStyle.display == 'none') {
        toc.style.display = 'flex';
        if (e) {
          statistics.send(constants.CONTENTS_CLICK);
        }
      } else {
        toc.style.display = 'none';
      }
    }


    function handleZoom(action, event) {
      var iframe = book.render.bodyEl;
      var mainContainer = document.querySelector('html');
      var iframeWindow = book.render.iframe.contentWindow;
      var bodyStyle = iframeWindow.getComputedStyle(iframe);
      var fontSize = bodyStyle.fontSize.match(/\d+/)[0];
      var sendStatistics;
      var zoomStep = 1;

      event.preventDefault();

      if (event instanceof MouseEvent) {
        sendStatistics = true;
      }

      switch (action) {
        case 'in':
          sendStatistics && statistics.send(constants.ZOOM_IN_CLICK);
          if (fontSize == constants.MAX_FONT_SIZE_PX) {
            return;
          }
          fontSize++;
          break;
        case 'out':
          sendStatistics && statistics.send(constants.ZOOM_OUT_CLICK);
          if (fontSize == constants.MIN_FONT_SIZE_PX) {
            return;
          }
          fontSize--;
          break;
        case 'normal':
          fontSize = constants.DEFAULT_FONT_SIZE_PX;
          break;
      }
      book.setStyle('fontSize', fontSize + 'px');
      mainContainer.style.fontSize = fontSize + 'px';
      book.settings.fontSize = fontSize;
      book.setSettings({
        fontSize: iframe.style.fontSize
      });
      book.trigger('render:pageZoom');
    }

    var handleModeChange = function(e) {
      var mode = document.querySelector('.read-mode');
      if (mode.classList.contains('spread')) {
        mode.classList.remove('spread');
        mode.classList.add('single');
        switchMode('spread');
      } else {
        mode.classList.add('spread');
        mode.classList.remove('single');
        switchMode('single');
      }
      book.trigger('render:layoutChange');

      if (e) {
        statistics.send(constants.READ_MODE_CLICK);
      }
    };

    var triggerContainer = document.querySelector('.trigger-container');

    var handleTriggerClick = function(e) {
      var contentsButton = triggerContainer.children[0];
      var bookmarksButton = triggerContainer.children[1];
      var contentsContainer = document.querySelector('.contents-container');
      var bookmarksContainer = document.querySelector('.bookmarks-container');

      if (e.srcElement == contentsButton) {
        contentsButton.classList.add('trigger-active');
        bookmarksButton.classList.remove('trigger-active');
        contentsContainer.style.display = 'flex';
        bookmarksContainer.style.display = 'none';
      }

      if (e.srcElement == bookmarksButton) {
        bookmarksButton.classList.add('trigger-active');
        contentsButton.classList.remove('trigger-active');
        bookmarksContainer.style.display = 'flex';
        contentsContainer.style.display = 'none';
        generateBookmarks();
      }
    };

    triggerContainer.addEventListener('click', handleTriggerClick, false);

    function controls() {
      var next = document.querySelector('.right-arrow');
      var prev = document.querySelector('.left-arrow');
      var start = document.querySelector('.start-reading');
      var main = document.querySelector('#main');
      var area = document.querySelector('#area');
      var iframe = document.querySelector('#area iframe');
      var menu = document.querySelector('.menu');
      var network = document.querySelector('#network');
      var settingLink = document.querySelector('#setting');
      var settings = document.querySelector('#settingsPanel');
      var toc = document.querySelector('#toc');
      var bars = document.querySelector('.bar');


      next.addEventListener('click', handleNextPage, false);
      prev.addEventListener('click', handlePrevPage, false);
      start.addEventListener('click', toggleCoverBook, false);

      var open = document.querySelector('.contents');
      var contents = document.querySelector('.contents-table');

      open.addEventListener('click', toggleToc, false);

      function animateMenu(state, callback) {
        menu.style.webkitTransitionProperty = 'height, background-color, box-shadow, opacity';
        menu.style.webkitTransitionDuration = '0.25s';
        menu.style.webkitTransitionTimingFunction = 'cubic-bezier(.75,0,.25,1)';
        if (state === 'show') {
          menu.style.height = '208px';
          menu.style.backgroundColor = 'rgba(255, 255, 255, 0.90)';
          menu.style.boxShadow = '0 1px 4px 0 rgba(0, 0, 0, 0.30)';
        } else {
          menu.style.height = '42px';
          menu.style.backgroundColor = 'rgba(127, 127, 127, 0.50)';
          menu.style.boxShadow = '0 0 0 0';
        }
        if (callback) {
          setTimeout(callback, 200);
        }
      }

      var point = document.querySelector('.point');
      var controlItems = document.querySelector('#control-items');

      function collapseSausage(e) {
        controlItems.style.display = 'none';
        animateMenu('hide');
        menu.classList.remove('sausage');
        menu.classList.add('tochka');
        main.classList.add('hidden');
        if (e) {
          storeMenuState(false);
          e.stopPropagation();
          statistics.send(constants.HIDE_MENU_CLICK);
        }
      }

      function expandSausage(e) {
        if (menu.classList.contains('sausage')) {
          return;
        }

        menu.classList.add('sausage');
        animateMenu('show', function() {
          menu.classList.remove('tochka');
          controlItems.style.display = 'block';
          main.classList.remove('hidden');
        });

        if (e) {
          storeMenuState(true);
          statistics.send(constants.SHOW_MENU_CLICK);
        }
      }

      menuIsVisible.then(function() {
        getMenuState(function(state) {
          switch (state) {
            case undefined:
              expandSausage();
              _.delay(collapseSausage, constants.COLLAPSE_MENU_TIMEOUT_MS);
              break;
            case true:
              expandSausage();
              break;
          };
        });
      });

      point.addEventListener('click', collapseSausage, false);

      var mode = document.querySelector('.read-mode');

      mode.addEventListener('click', handleModeChange, false);

      menu.addEventListener('click', expandSausage, false);

      var plus = document.querySelector('.plus');
      var minus = document.querySelector('.minus');

      plus.addEventListener('click', handleZoomIn, false);
      minus.addEventListener('click', handleZoomOut, false);

      var bookmark = document.querySelector('.bookmark');

      var handleBookmarkSet = function() {
        if (bookmark.classList.contains('bookmark-active')) {
          setBookmarkView('inactive');
          statistics.send(constants.BOOKMARK_OFF_CLICK);
          book.bookmarks = _.filter(book.bookmarks, function(bookmark) {
            return !book.render.isBookmarkVisible(bookmark.cfi);
          });
        } else {
          var currentCfi = book.render.currentLocationCfi;
          var element = book.render.findElementByCfi(currentCfi);
          var bookmarkTitle = element.innerText;
          if (bookmarkTitle.length < 5) {
            bookmarkTitle = loadTimeData.getString('bookmarkDefault');
          }

          book.bookmarks.push({
            cfi: currentCfi,
            title: bookmarkTitle
          });

          setBookmarkView('active');
          statistics.send(constants.BOOKMARK_CLICK);
        }

        book.setSettings({
          bookmarks: book.bookmarks
        });

        generateBookmarks();
      };

      bookmark.addEventListener('click', handleBookmarkSet, false);

      var tocClose = document.querySelector('.button-close');
      tocClose.addEventListener('click', toggleToc, false);
    }

    function setStrings() {
      i18nTemplate.process(document, loadTimeData);
    }

    window.onpopstate = function() {
      if (history.state) {
        book.render.gotoBookmark(history.state.cfi);
      }
    }

    // Export.
    return {
      getBook: function(options) {
        if (Book) {
          return Book;
        }

        // Create a new book object.
        Book = new JSBook(options);
        
        Book.getMetadata().then(meta);
        Book.getToc().then(toc);
        Book.getStrings().then(setStrings);

        Book.ready.all.then(bookReady);
        
        Book.renderTo('#area');

        Book.on('render:pageChanged', handlePageChanged);

        Book.on('frameReady', handleFrameReady);

        Book.on('switchMode', handleModeChange);

        Book.on('checkBookmarkVisibility', checkBookmarkVisibility);

        Book.on('toggleCover', toggleCoverBook);

        return Book;
      }
    };

  });
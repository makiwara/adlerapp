define([

  'lodash',
  'async',
  'RSVP',

  'chapter',
  'core',
  'epubcfi',
  'hooks',
  'parser',
  'renderer',
  'unarchiver'

], function(
    _,
    async,
    RSVP,
    Chapter,
    Core,
    EpubCFI,
    Hooks,
    Parser,
    Renderer,
    Unarchiver
) {

  var DEBUG = false;
  var bookInstance = null;

  var Book = function(options) {
  
    var book = this;

    bookInstance = this;
  
    book.settings = _.defaults(options || {}, {
      bookPath : null,
      contained : false,
      width : false,
      height: false,
      spreads: true,
      fixedLayout : false,
      version: 1,
      styles : {},
      format: null
    });

    book.spinePos = 0;
    book.bookmarks = [];

    book.setSettingsQueue = async.queue(function(settings, callback) {
      var key = book.bid + '.settings';

      chrome.storage.local.get(key, function(currentSettings) {
        var newSettings = _.assign(currentSettings[key] || currentSettings,
            settings);
        var value = {};
        value[key] = newSettings;
        chrome.storage.local.set(value, callback);
      });
    });

    book.hooks = {
      'beforeChapterDisplay' : []
    };

    // Get pre-registered hooks.
    book.getHooks();

    if (book.settings.format == 'epub') {
      book.ready = {
        manifest: new RSVP.Promise(),
        spine: new RSVP.Promise(),
        metadata: new RSVP.Promise(),
        cover: new RSVP.Promise(),
        toc: new RSVP.Promise(),
        strings: new RSVP.Promise()
      };
    } else {
      book.ready = {
        metadata: new RSVP.Promise(),
        toc: new RSVP.Promise(),
        strings: new RSVP.Promise()
      };
    }

    book.ready.all = RSVP.all(_.values(this.ready));

    book.opened = new RSVP.Promise();

    if (book.settings.bookPath) {
      book.open();
    }
  };

  Book.getInstance = function() {
    if (!bookInstance) {
      bookInstance = new Book();
    }

    return bookInstance;
  };

  Book.prototype.open = function(forceReload) {
    var book = this;
    var bookPath = book.settings.bookPath;
    var opened;

    book.bookUrl = book.urlFrom(bookPath);

    if (book.settings.contained) {

      book.bookUrl = '';

      if (book.settings.format == 'epub') {
        opened = book.unarchive(bookPath).then(function() {
          return book.unpack();
        });
      } else {
        opened = book.unarchive(bookPath).then(function(mas) {
          mas.root.children[0].name += '.xhtml';
          return book.unpack(mas.root.children[0].name);
        });
      }
    } else {
      opened = Core.createBlobURL(bookPath).then(function(url) {
        book.unpack(url);
      });
    }

    opened.then(function() {
      book.opened.resolve();
    });

    return opened;
  };

  Book.prototype.unpack = function(containerPath) {
    var book = this;
    var parse = new Parser();

    if (book.settings.format == 'epub') {
      var containerPath = containerPath || 'META-INF/container.xml';
    } else {
      var containerPath = containerPath || '';
      book.bookUrl = containerPath;
    }

    yandex.reader.getStrings(function(strings) {
      loadTimeData.data = strings;
      book.ready.strings.resolve(strings);
    });

    // Return chain of promises.
    if (book.settings.format == 'epub') {
      return book.loadXml(book.bookUrl + containerPath).then(
          function(containerXml) {
        return parse.container(containerXml);
      }).then(function(paths) {
        book.settings.contentsPath = book.bookUrl + paths.basePath;
        book.settings.packageUrl = book.bookUrl + paths.packagePath;
        return book.loadXml(book.settings.packageUrl);
      }).then(function(packageXml) {
        return parse.package(packageXml, book.settings.contentsPath);
      }).then(function(contents) {
        book.contents = contents;
        book.manifest = book.contents.manifest;
        book.spine = book.contents.spine;
        book.spineIndexByURL = book.contents.spineIndexByURL;
        book.metadata = book.contents.metadata;

        book.cover = book.contents.cover = book.settings.contentsPath +
            contents.coverPath;

        book.spineNodeIndex = book.contents.spineNodeIndex =
            contents.spineNodeIndex;

        book.ready.manifest.resolve(book.contents.manifest);
        book.ready.spine.resolve(book.contents.spine);
        book.ready.metadata.resolve(book.contents.metadata);
        book.ready.cover.resolve(book.contents.cover);

        if (contents.tocPath) {

          book.settings.tocUrl = book.settings.contentsPath + contents.tocPath;

          book.loadXml(book.settings.tocUrl).then(function(tocXml) {
            return parse.toc(tocXml);
          }).then(function(toc) {
            book.toc = book.contents.toc = toc;
            book.ready.toc.resolve(book.contents.toc);
          });
        } else {
          book.ready.toc.resolve(null);
        }
      }).then(null, function(error) {
        console.error(error);
      });
    } else {
      return book.loadXml(containerPath).then(function(packageXml) {
        return parse.package(packageXml, book.settings.contentsPath);
      }).then(function(contents) {
        book.contents = contents;
        book.metadata = book.contents.metadata;
        book.ready.metadata.resolve(book.contents.metadata);
        book.toc = book.contents.toc = parse.toc(contents.formatted);
        book.ready.toc.resolve(book.contents.toc);

      }).then(null, function(error) {
        console.error(error);
      });
    }
  };

  Book.prototype.getMetadata = function() {
    return this.ready.metadata;
  };

  Book.prototype.getToc = function() {
    return this.ready.toc;
  };

  Book.prototype.getStrings = function() {
    return this.ready.strings;
  };

  Book.prototype.loadXml = function(url) {
    if (this.settings.contained) {
      return this.zip.getXml(url);
    } else {
      return Core.request(url, 'xml');
    }
  };

  Book.prototype.urlFrom = function(bookPath) {
    var absolute = bookPath.search('://') != -1;
    var fromRoot = bookPath[0] == '/';
    var location = window.location;
    var origin = location.origin || location.protocol + '//' + location.host;

    if (absolute) {
      return bookPath;
    }

    if (!absolute && fromRoot) {
      return origin + bookPath;
    }

    if (!absolute && !fromRoot) {
      if (bookPath.slice(0, 3) == '../') {
        return Core.resolveUrl(location.href, bookPath);
      }

      return origin + Core.folder(location.pathname) + bookPath;
    }
  };

  Book.prototype.unarchive = function(bookPath) {
    var book = this;
    var unarchived;

    book.zip = new Unarchiver();

    return this.zip.openZip(bookPath);
  };

  Book.prototype.renderTo = function(area) {
    var book = this;
    var rendered;

    if (_.isElement(area)) {
      this.area = area;
    } else {
      if (typeof area == 'string') {
        this.area = document.querySelector(area);
      } else {
        DEBUG && console.warn('Not an element:', area);
        return;
      }
    }

    rendered = this.opened.then(function() {
      book.render = new Renderer(book);

      return book.startDisplay();
    }, function(error) {
      console.error(error);
    });

    rendered.then(null, function(error) {
      console.error(error);
    });

    return rendered;
  };

  Book.prototype.startDisplay = function() {
    var display;

    if (this.settings.previousLocationCfi) {
      display = this.displayChapter(this.settings.previousLocationCfi);
    } else {
      display = this.displayChapter(this.spinePos);
    }

    return display;
  };

  Book.prototype.displayChapter = function(chap, end) {
    var book = this;

    var render;
    var cfi;
    var pos;

    if (!book.render) {
      return Promise.reject();
    }

    if (_.isNumber(chap)) {
      pos = chap;
    } else {
      cfi = new EpubCFI(chap);
      pos = cfi.spinePos;
    }

    var spineLength = book.spine ? book.spine.length : 1;

    if (pos >= spineLength) {
      DEBUG && console.log('Reached End of Book');
      return Promise.resolve();
    }

    if (pos < 0) {
      DEBUG && console.log('Reached Start of Book');
      return Promise.resolve();
    }

    book.spinePos = pos;

    var position = this.spine ? this.spine[pos] : 1;
    book.chapter = new Chapter(position);

    if (book.settings.format == 'fb2') {
      book.chapter.href = book.bookUrl;
    }

    render = book.render.chapter(book.chapter);

    if (cfi) {
      render.then(function(chapter) {
        chapter.currentLocationCfi = chap;
        chapter.gotoCfiFragment(cfi);
      });
    } else {
      if (end) {
        render.then(function(chapter){
          chapter.gotoChapterEnd();
        });
      }
    }

    return render;
  };

  Book.prototype.nextPage = function() {
    var next;

    if (!this.render) {
      return;
    }

    next = this.render.nextPage();

    if (!next) {
      return this.nextChapter();
    }
  };

  Book.prototype.prevPage = function() {
    var prev;

    if (!this.render) {
      return;
    }

    prev = this.render.prevPage();
    
    if (!prev) {
      return this.prevChapter();
    }
  };

  Book.prototype.curPage = function() {
    if (!this.render) {
      return;
    }

    return this.render.curPage();
  };

  Book.prototype.chapterCount = function() {
    return this.spine ? this.spine.length - 1 : 0;
  };

  Book.prototype.isChapterLast = function() {
    if (this.settings.format == 'fb2') {
      return this.isPageLast();
    }
    return this.chapterCount() == this.chapter.spinePos;
  };

  Book.prototype.isPageLast = function() {
    return this.render.chapterPos == this.render.displayedPages;
  };

  Book.prototype.isChapterFirst = function() {
    if (this.settings.format == 'fb2') {
      return this.isPageFirst();
    }
    return this.chapter.spinePos < 1;
  };

  Book.prototype.isPageFirst = function() {
    return this.render.chapterPos == 1;
  };

  Book.prototype.nextChapter = function() {
    return this.displayChapter(this.spinePos + 1);
  };

  Book.prototype.prevChapter = function() {
    return this.displayChapter(this.spinePos - 1, true);
  };

  Book.prototype.goto = function(url) {
    var split = url.split('#');
    var chapter = split[0];
    var section = split[1] || false;
    var absoluteURL = (chapter.search('://') == -1) ?
        this.settings.contentsPath + chapter : chapter;
    var spinePos = this.spineIndexByURL[absoluteURL];
    var book = this;

    if (!book.render) {
      return;
    }

    // If link fragment only stay on current chapter.
    if (!chapter) {
      spinePos = book.chapter.spinePos;
    }

    if (typeof (spinePos) != 'number') {
      return false;
    }

    history.replaceState({cfi: book.render.currentLocationCfi});

    if (spinePos != book.chapter.spinePos || !book.chapter) {
      // Load new chapter if different than current.
      return book.displayChapter(spinePos).then(function() {
        if (section) {
          book.render.section(section);
        }
        history.pushState({cfi: book.render.currentLocationCfi});
      });
    } else {
      // Only goto section.
      if (section) {
        book.render.section(section);
      }
      history.pushState({cfi: book.render.currentLocationCfi});

      return new RSVP.Promise().resolve(book.currentChapter);
    }
  };

  Book.prototype.setStyle = function(style, val) {
    this.settings.styles[style] = val;

    if (this.render) {
      this.render.setStyle(style, val);
    }
  };

  Book.prototype.removeStyle = function(style) {
    if (this.render) {
      this.render.removeStyle(style);
    }

    delete this.settings.styles[style];
  };

  Book.prototype.getHooks = function(){
    var book = this;
    var plugs;

    plugTypes = _.values(this.hooks);

    for (plugType in this.hooks) {
      plugs = _.values(Hooks[plugType]);

      plugs.forEach(function(hook) {
        book.registerHook(plugType, hook);
      });
    }
  };

  Book.prototype.registerHook = function(type, toAdd, toFront) {
    var book = this;
    
    if (typeof(book.hooks[type]) !== 'undefined') {

      if (typeof(toAdd) === 'function') {
        if (toFront) {
          book.hooks[type].unshift(toAdd);
        } else {
          book.hooks[type].push(toAdd);
        }
      } else {
        if (Array.isArray(toAdd)) {
          toAdd.forEach(function(hook) {
            if (toFront) {
              book.hooks[type].unshift(hook);
            } else {
              book.hooks[type].push(hook);
            }
          });
        }
      }
    } else {
      book.hooks[type] = [func];
    }
  };

  Book.prototype.triggerHooks = function(type, callback, passed) {
    var hooks;
    var count;

    if (typeof (this.hooks[type]) == 'undefined') {
      return false;
    }

    hooks = this.hooks[type];

    count = 0;

    function countdown() {
      if (count == hooks.length && callback) {
        callback();
      }
    }

    hooks.forEach(function(hook) {
      count++;
      hook(countdown, passed);
    });
  };

  Book.prototype.getBid = function() {
    var result = '';
    var unprocessedId = book.metadata.bookTitle + book.metadata.creator;
    unprocessedId = unprocessedId.replace(/[^\wа-яА-ЯёЁ]/g, '');
    var result = _.reduce(unprocessedId, function(string, i) {
      return string + unprocessedId.charCodeAt(i);
    }, '');

    result = book.size + result;

    this.bid = result.slice(0, 32);

    return this.bid;
  };

  Book.prototype.getSettings = function(callback) {
    var key = book.bid + '.settings';

    chrome.storage.local.get(key, function(settings) {
      if (_.isEmpty(settings)) {
        callback({});
      } else {
        callback(settings[key]);
      }
    });
  };

  Book.prototype.setSettings = function(settings, callback) {
    this.setSettingsQueue.push(settings, callback);
  };

  Book.prototype.restoreSettings = _.once(function(callback) {
    this.getBid();

    this.getSettings(function(settings) {
      if (settings.fontSize) {
        this.setStyle('fontSize', settings.fontSize);
      }

      if (settings.position) {
        this.render.gotoBookmark(settings.position);
        async.nextTick(this.trigger.bind(this, 'toggleCover'));
      }

      if (settings.view) {
        if (settings.view !== 'spread') {
          async.nextTick(this.trigger.bind(this, 'switchMode'));
        }
      }

      if (settings.bookmarks) {
        this.bookmarks = settings.bookmarks;
      }

      callback();
    }.bind(this));
  });

  // Enable binding events to book.
  RSVP.EventTarget.mixin(Book.prototype);

  // Export.
  return Book;

});

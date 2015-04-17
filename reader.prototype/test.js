Lorgnon.DEBUG = true;

(function () {

  Lorgnon.Styles.container.right = "24px";

  var ChatFlipper = function (reader) {

    var API = { constructor: ChatFlipper }
    var k = API.constants = API.constructor;
    var p = API.properties = {
      pageCount: 1
    }

    function initialize() {
      p.reader = reader;
    }
    function addPage(pageDiv) {
      pageDiv.m.dimensions = new Lorgnon.Dimensions.Columns(pageDiv);
    }
    function getPlace() {
      return page().m.place;
    }
    function moveTo(locus, callback) {
      var fn = frameToLocus;
      if (typeof callback == "function") {
        fn = function (locus) { frameToLocus(locus); callback(locus); }
      }
      p.reader.getBook().setOrLoadPageAt(page(), locus, fn);
    }


    function listenForInteraction(panelClass) {
      if (typeof panelClass != "function") {
        if (Lorgnon.Browser.on.Kindle3) {
          panelClass = Lorgnon.Panels.eInk;
        }
        panelClass = panelClass || k.DEFAULT_PANELS_CLASS;
      }
      if (!panelClass) { throw("Panels not found."); }
      p.panels = new panelClass(API, { 'end': turn });
    }


    function page() {
      return p.reader.dom.find('page');
    }


    function turn(dir) {

      function _actual_turn(dir) {
        p.reader.selection.deselect();
        moveTo({ page: getPlace().pageNumber() + dir});
        p.reader.dispatchEvent('monocle:turning');  
      }

      //======================================================================
      var prevdir = $(page().m.chatFrame).data('dir');
      if (prevdir !== undefined && prevdir !== 0) {
        // turn the page if going to next; elsewhen we are already here!
        if (dir > 0) _actual_turn(dir);
        // hide and deinitialize chat
        $(page().m.chatFrame).hide();
        $(page().m.chatFrame).data('dir', 0);
      }
      else {
        // if going backward, turn before chat
        if (dir < 0) _actual_turn(dir);

        // discover chat
        var CHAT = [];
        var m = p.reader.dom.find('page').m;
        if (m.place) {
          var dims = m.dimensions.pageDimensions();
          var pageno = getPlace().pageNumber();
          var min = dims.width*(pageno-1);
          var max = dims.width*pageno;
          var iframe = m.activeFrame;
          $(iframe.contentDocument).find('.CHAT').each(function(){
            var pos = $(this).position();
            if (pos.left >= min && pos.left < max) 
            {
              CHAT[ CHAT.length ] = $(this);
              console.log(pos, this.className, this.innerHTML)  
            }     
          })
        }
        if (CHAT.length > 0) {
          // TODO DISPLAY CHAT
          function build() {
            var url = url || (Lorgnon.Browser.on.UIWebView ? "blank.html" : "about:blank");
            m.chatFrame = page().dom.append('iframe', 'chat');
            m.chatFrame.src = url;
            console.log(m.chatFrame)
            $(m.chatFrame).css({
              position: 'absolute',
              //'z-index': 100,
              top: 0, left: 0,
              width: '100%', height: '100%',
              border: 0,
              display: 'none',
              background: 'red'
            })
            m.chatFrame.onload = function() {
              console.log(m.chatFrame.contentDocument.body)
              $(m.chatFrame.contentDocument.body).css({
                  width: '100%', height: '100%',
                  margin: 0,
                  background: 'blue'
                })
              p.panels.disable();
              p.panels.enable();
            }
          }
          if (!m.chatFrame) build();
          $(m.chatFrame).show();
          // store direction
          $(page().m.chatFrame).data('dir', dir);
        } else {
          // if chat does not appear and we are going forward, turn the page
          if (dir > 0) _actual_turn(dir);
        } 
      }
      //======================================================================

    }


    function frameToLocus(locus) {
      page().m.dimensions.translateToLocus(locus);
      Lorgnon.defer(function () { p.reader.dispatchEvent('monocle:turn'); });
    }


    // THIS IS THE CORE API THAT ALL FLIPPERS MUST PROVIDE.
    API.pageCount = p.pageCount;
    API.addPage = addPage;
    API.getPlace = getPlace;
    API.moveTo = moveTo;
    API.listenForInteraction = listenForInteraction;

    initialize();

    return API;
  }

  ChatFlipper.FORWARDS = 1;
  ChatFlipper.BACKWARDS = -1;
  ChatFlipper.DEFAULT_PANELS_CLASS = Lorgnon.Panels.TwoPane;


  var bookData = Lorgnon.bookData({
    components: [
      'components/2.html',
      'components/1.html',
      'components/3.html',
      'components/toc.html'
    ],
    chapters:[
      {
        title: "The Signal Man",
        src: "components/1.html"
      },
      {
        title: "The Haunted House",
        src: "components/2.html",
        children: [
          {
            title: "Chapter I — The Mortals in the House",
            src: "components/2.html#p2ch1"
          },
          {
            title: "Chapter II — The Ghost in Master B.'s Room",
            src: "components/2.html#p2ch2"
          }
        ]
      },
      {
        title: "The Trial for Murder",
        src: "components/3.html"
      }
    ],
    metadata: {
      title: "Three Ghost Stories",
      creator: "Charles Dickens"
    }
  });

  // Initialize the reader element.
  Lorgnon.Events.listen(
    window,
    'load',
    function () {
      var readerOptions = {};
      readerOptions.panels = Lorgnon.Panels.Magic;
      readerOptions.flipper = ChatFlipper;
      readerOptions.stylesheet = "body { " +
        "color: #221100;" +
        "font-family: Palatino, Georgia, serif;" +
      "}";

      /* Initialize the reader */
      window.reader = Lorgnon.Reader(
        'reader', bookData, readerOptions, function(reader) {
          reader.addControl(placeSaver, 'invisible');
      });
    }
  );
})();
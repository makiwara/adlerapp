Monocle.DEBUG = true;

(function () {

  Monocle.Styles.container.right = "24px";


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
      pageDiv.m.dimensions = new Monocle.Dimensions.Columns(pageDiv);
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
        if (Monocle.Browser.on.Kindle3) {
          panelClass = Monocle.Panels.eInk;
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
            var url = url || (Monocle.Browser.on.UIWebView ? "blank.html" : "about:blank");
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
      Monocle.defer(function () { p.reader.dispatchEvent('monocle:turn'); });
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
  ChatFlipper.DEFAULT_PANELS_CLASS = Monocle.Panels.TwoPane;


  var bookData = Monocle.bookData({
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
  Monocle.Events.listen(
    window,
    'load',
    function () {
      var readerOptions = {};

      /* PLACE SAVER */
      var bkTitle = bookData.getMetaData('title');
      var placeSaver = new Monocle.Controls.PlaceSaver(bkTitle);
      readerOptions.place = placeSaver.savedPlace();
      readerOptions.panels = Monocle.Panels.Magic;
      readerOptions.flipper = ChatFlipper;
      readerOptions.stylesheet = "body { " +
        "color: #210;" +
        "font-family: Palatino, Georgia, serif;" +
      "}";

      /* Initialize the reader */
      window.reader = Monocle.Reader(
        'reader',
        bookData,
        readerOptions,
        function(reader) {
          reader.addControl(placeSaver, 'invisible');

          // =================================================================================
          // =================================================================================
          // =================================================================================
          reader.listen('monocle:boundarystart', function(evt){ 
            console.log('boundarystart');
          })
          reader.listen('monocle:boundaryend', function(evt){
            console.log('boundaryend')
          })
          reader.listen('monocle:pagechange', function(evt){ 
            // var dims = evt.m.page.m.dimensions.pageDimensions();
            // var page = evt.m.pageNumber;
            // console.log(page);
            // reader.CHAT = [];
            // $(evt.m.page.m.activeFrame.contentDocument).find('.CHAT').each(function(){
            //   var pos = $(this).position();
            //   if (pos.left >= dims.width*(page-1) && pos.left < dims.width*page) {
            //     reader.CHAT[ reader.CHAT.length ] = $(this);
            //     console.log($(this).position(), this.className, this.innerHTML)  
            //   }
              
            // })
          });
          // =================================================================================
          // =================================================================================
          // =================================================================================


          /* SPINNER */
          var spinner = Monocle.Controls.Spinner(reader);
          reader.addControl(spinner, 'page', { hidden: true });
          spinner.listenForUsualDelays('reader');

          /* Because the 'reader' element changes size on window resize,
           * we should notify it of this event. */
          Monocle.Events.listen(
            window,
            'resize',
            function () { window.reader.resized() }
          );

          /* MAGNIFIER CONTROL */
          var magnifier = new Monocle.Controls.Magnifier(reader);
          reader.addControl(magnifier, 'page');

          /* The stencil activates internal links */
          var stencil = new Monocle.Controls.Stencil(reader);
          reader.addControl(stencil);
          //stencil.toggleHighlights();

          /* BOOK TITLE RUNNING HEAD */
          var bookTitle = {}
          bookTitle.contentsMenu = Monocle.Controls.Contents(reader);
          reader.addControl(bookTitle.contentsMenu, 'popover', { hidden: true });
          bookTitle.createControlElements = function () {
            var cntr = document.createElement('div');
            cntr.className = "bookTitle";
            var runner = document.createElement('div');
            runner.className = "runner";
            runner.innerHTML = reader.getBook().getMetaData('title');
            cntr.appendChild(runner);

            Monocle.Events.listenForContact(
              cntr,
              {
                start: function (evt) {
                  if (evt.preventDefault) {
                    evt.stopPropagation();
                    evt.preventDefault();
                  } else {
                    evt.returnValue = false;
                  }
                  reader.showControl(bookTitle.contentsMenu);
                }
              }
            );

            return cntr;
          }
          reader.addControl(bookTitle, 'page');


          /* CHAPTER TITLE RUNNING HEAD */
          var chapterTitle = {
            runners: [],
            createControlElements: function (page) {
              var cntr = document.createElement('div');
              cntr.className = "chapterTitle";
              var runner = document.createElement('div');
              runner.className = "runner";
              cntr.appendChild(runner);
              this.runners.push(runner);
              this.update(page);
              return cntr;
            },
            update: function (page) {
              var place = reader.getPlace(page);
              if (place) {
                this.runners[page.m.pageIndex].innerHTML = place.chapterTitle();
              }
            }
          }
          reader.addControl(chapterTitle, 'page');
          reader.listen(
            'monocle:pagechange',
            function (evt) { 
              chapterTitle.update(evt.m.page); }
          );


          /* PAGE NUMBER RUNNING HEAD */
          var pageNumber = {
            runners: [],
            createControlElements: function (page) {
              var cntr = document.createElement('div');
              cntr.className = "pageNumber";
              var runner = document.createElement('div');
              runner.className = "runner";
              cntr.appendChild(runner);
              this.runners.push(runner);
              this.update(page, page.m.place.pageNumber());
              return cntr;
            },
            update: function (page, pageNumber) {
              if (pageNumber) {
                this.runners[page.m.pageIndex].innerHTML = pageNumber;
              }
            }
          }
          reader.addControl(pageNumber, 'page');
          reader.listen(
            'monocle:pagechange',
            function (evt) {
              pageNumber.update(evt.m.page, evt.m.pageNumber);
            }
          );

          /* Scrubber */
          var scrubber = new Monocle.Controls.Scrubber(reader);
          reader.addControl(scrubber, 'popover', { hidden: true });
          var showFn = function (evt) {
            evt.stopPropagation();
            reader.showControl(scrubber);
            scrubber.updateNeedles();
          }
          for (var i = 0; i < chapterTitle.runners.length; ++i) {
            Monocle.Events.listenForContact(
              chapterTitle.runners[i].parentNode,
              { start: showFn }
            );
            Monocle.Events.listenForContact(
              pageNumber.runners[i].parentNode,
              { start: showFn }
            );
          }
        }
      );
    }
  );
})();
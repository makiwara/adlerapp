define([

  'core'

], function(Core) {

    var replace = {};

    replace.head = function(callback, renderer) {
      renderer.replaceWithStored('link[href]', 'href', replace.links, callback);
    };

    replace.resources = function(callback, renderer){
      renderer.replaceWithStored('[src]', 'src', replace.srcs, callback);
    };

    replace.svg = function(callback, renderer) {
      renderer.replaceWithStored('image', 'xlink:href',
          function(_store, full, done) {
        _store.getUrl(full).then(done);
      }, callback);
    };

    replace.srcs = function(_store, full, done) {
      _store.getUrl(full).then(done);
    };

    replace.links = function(_store, full, done, link) {
      // Handle replacing urls in CSS
      if (link.getAttribute('rel') === 'stylesheet') {
        replace.stylesheets(_store, full).then(done);
      } else {
        _store.getUrl(full).then(done); 
      }
    };

    replace.lang = function(){
      document.querySelector('#meta-content-language').setAttribute(
        'content', navigator.language
      );
    };

    replace.stylesheets = function(_store, full) {
      var promise = new RSVP.Promise();

      if(!_store) {
        return;
      }

      _store.getText(full).then(function(text){
        var url;

        replace.cssUrls(_store, full, text).then(function(newText){
          var _URL = window.URL;
          var blob = new Blob([newText], { 'type' : 'text/css' }),
            url = _URL.createObjectURL(blob);

          promise.resolve(url);

        }, function(e) {console.error(e)});
      });

      return promise;
    };

    replace.cssUrls = function(_store, base, text){
      var promise = new RSVP.Promise(),
        promises = [],
        matches = text.match(/url\(\'?\"?([^\'|^\"]*)\'?\"?\)/g);

      if(!_store) return;

      if(!matches){
        promise.resolve(text);
        return promise;
      }

      matches.forEach(function(str){
        var full = Core.resolveUrl(base, str.replace(/url\(|[|\)|\'|\"]/g, ''));
        replaced = _store.getUrl(full).then(function(url){
          text = text.replace(str, 'url("'+url+'")');
        }, function(e) {console.error(e)} );

        promises.push(replaced);
      });

      RSVP.all(promises).then(function(){
        promise.resolve(text);
      });

      return promise; 
    };

    // Export.
    return replace;

});
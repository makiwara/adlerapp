define([

  'RSVP'

], function(RSVP) {

    var Core = {};

    Core.request = function(url, type) {
      var promise = new RSVP.Promise();

      var xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;

      if (type == 'blob'){
        xhr.responseType = 'blob';
        xhr.overrideMimeType('application/xhtml+xml');
      }

      if (type == 'json') {
        xhr.setRequestHeader('Accept', 'application/json');
      }

      if (type == 'xml') {
        xhr.overrideMimeType('text/xml');
      }

      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200 || this.responseXML) {
            var r;
            
            if (type == 'xml') {
              r = this.responseXML;
            } else {
              if (type == 'json') {
                r = JSON.parse(this.response);
              } else {
                r = this.response;
              }
            }

            promise.resolve(r);
          }
          else { 
            promise.reject(this);
          }
        }
      };
      
      return promise;
    };

    Core.createBlobURL = function(url) {
      return this.request(url, 'blob').then(function(blob) {
        return window.URL.createObjectURL(blob);
      });
    };

    Core.folder = function(url){
      
      var slash = url.lastIndexOf('/'),
      folder = url.slice(0, slash + 1);

      if (slash == -1) {
        folder = '';
      }

      return folder;
    };

    Core.addCss = function(src, callback, target) {
      var s;
      var r;
      r = false;
      s = document.createElement('link');
      s.type = 'text/css';
      s.rel = 'stylesheet';
      s.href = src;
      s.onload = s.onreadystatechange = function() {
        if ( !r && (!this.readyState || this.readyState == 'complete') ) {
          r = true;
          if (callback) {
            callback();
          }
        }
      }

      target = target || document.body;
      target.appendChild(s);
    };

    Core.resolveUrl = function(base, path) {
      var url;
      var segments = [];
      var folders = base.split('/');
      var paths;
         
      folders.pop();

      paths = path.split('/');
      paths.forEach(function(p) {
        if (p === '..') {
          folders.pop();
        } else {
          segments.push(p);
        }
      });
       
      url = folders.concat(segments);

      return url.join('/');
    }

    // Export.
    return Core;

});

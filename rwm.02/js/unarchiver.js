define([

  'constants',

  'RSVP'

], function(constants, RSVP) {

    var DEBUG = false;

    var Unarchiver = function(url) {
      this.libPath = constants.ZIP_PATH;
      this.zipUrl = url;
      this.loadLib();
      this.urlCache = {};

      this.zipFs = new zip.fs.FS();

      return this.promise;
    };

    Unarchiver.prototype.loadLib = function(callback) {
      if (typeof(zip) == "undefined") {
        DEBUG && console.error("Zip lib not loaded");
      }
      zip.workerScriptsPath = this.libPath;
    };

    Unarchiver.prototype.openZip = function(zipUrl, callback) { 
      var promise = new RSVP.Promise();
      var zipFs = this.zipFs;
      zipFs.importHttpContent(zipUrl, false, function(reader) {
        book.size = reader.size;
        promise.resolve(zipFs);
      }, this.failed);

      return promise;
    };

    Unarchiver.prototype.getXml = function(url) {
      return this.getText(url).then(function(text) {
        var parser = new DOMParser();
        return parser.parseFromString(text, 'application/xml');
      });
    };

    Unarchiver.prototype.getUrl = function(url, mime) {
      var unarchiver = this;
      var promise = new RSVP.Promise();
      var entry = this.zipFs.find(url); 
      var _URL = window.URL;

      if (!entry) {
        DEBUG && console.warn('No entry for url', url);
        if (book.settings.format == 'fb2') {
          promise.resolve();
          return promise;
        }
      }

      if (url in this.urlCache) {
        promise.resolve(this.urlCache[url]);
        return promise;
      }

      entry.getBlob(mime || zip.getMimeType(entry.name), function(blob) {
        var tempUrl = _URL.createObjectURL(blob);
        promise.resolve(tempUrl);
        unarchiver.urlCache[url] = tempUrl;
      });

      return promise;
    };

    Unarchiver.prototype.getText = function(url) {
      var unarchiver = this;
      var promise = new RSVP.Promise();
      var entry = this.zipFs.find(url); 
      var _URL = window.URL;

      if (!entry) {
        DEBUG && console.error('No entry for url', url);
      }

      var encoding = 'utf-8';

      entry.getText(function(text) {
        var header = text.substring(0,50);
        var realEncoding = header.match(/encoding=['"]+(.+)['"]+/);
        if (realEncoding) {
          realEncoding = realEncoding[1].toLowerCase();
          if (encoding !== realEncoding) {
            entry.getText(function(text) {
              promise.resolve(text);
            }, null, null, realEncoding);
          } else {
            promise.resolve(text);
          }
        } else {
          promise.resolve(text);
        }
      }, null, null, encoding);

      return promise;
    };

    Unarchiver.prototype.revokeUrl = function(url) {
      var _URL = window.URL;
      var fromCache = unarchiver.urlCache[url];
      if (fromCache) {
        _URL.revokeObjectURL(fromCache);
      }
    };

    Unarchiver.prototype.failed = function(error) {
      DEBUG && console.error(error);
    };

    // Export.
    return Unarchiver;

});
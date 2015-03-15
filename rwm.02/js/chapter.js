define([

  'RSVP',

  'core'

], function(RSVP, Core) {

    var Chapter = function(spineObject) {
      this.href = spineObject.href;
      this.id = spineObject.id;
      this.spinePos = spineObject.index;
      this.properties = spineObject.properties;
      this.linear = spineObject.linear;
      this.pages = 1;
    };

    Chapter.prototype.contents = function(store) {
      if (store) {
        return store.get(href);
      } else {
        return Core.request(href, 'xml');
      }
    };

    Chapter.prototype.url = function(store) {
      var promise = new RSVP.Promise();

      if (store) {
        if (!this.tempUrl) {
          this.tempUrl = store.getUrl(this.href);
        }

        return this.tempUrl;
      } else {
        promise.resolve(this.href);
        return promise;
      }
    };

    Chapter.prototype.setPages = function(num) {
      this.pages = num;
    };

    Chapter.prototype.getPages = function(num) {
      return this.pages;
    };

    Chapter.prototype.getID = function(){
      return this.ID;
    };

    Chapter.prototype.unload = function(store) {
      
      if (this.tempUrl && store) {
        store.revokeUrl(this.tempUrl);
        this.tempUrl = false;
      }
    };

    // Export.
    return Chapter;

});
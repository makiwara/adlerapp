define([

'hooks'

], function(Hooks) {
    Hooks.register('beforeChapterDisplay').smartimages = function(callback,
        chapter) {

      var images = chapter.doc.querySelectorAll('img, svg'),
        items = Array.prototype.slice.call(images),
        iheight = chapter.bodyEl.clientHeight,
        oheight;

      items.forEach(function(item) {

        function size() {
          if (item.naturalHeight > book.area.clientHeight) {
            item.style.maxHeight = '90%';
          }
          if (item.tagName == 'svg') {
            item.style.height = 'auto';
          }
        }

        item.addEventListener('load', size, false);

        chapter.on('render:resized', size);

        chapter.on('render:chapterUnloaded', function() {
          item.removeEventListener('load', size);
          chapter.off('render:resized', size);
        });

        size();

      });

      if (callback) {
        callback();
      }
    };
});

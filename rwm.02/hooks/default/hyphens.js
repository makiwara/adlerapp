define([

  'hooks',
  'utils'

], function(Hooks, utils) {
    Hooks.register("beforeChapterDisplay").hyphens = function(callback,
        chapter) {

      utils.makeHyphens(chapter.doc);

      if (callback) {
        callback();
      }
    }
});
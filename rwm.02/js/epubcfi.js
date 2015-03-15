define(function() {

  var DEBUG = false;

  var EpubCFI = function(cfiStr) {
    if (cfiStr) {
      return this.parse(cfiStr);
    }
  };

  EpubCFI.prototype.generateChapter = function(spineNodeIndex, pos, id) {
    var cfi;

    if (book.settings.format == 'epub') {
      var pos = parseInt(pos);
      var spineNodeIndex = spineNodeIndex + 1;
      cfi = '/'+spineNodeIndex+'/';

      cfi += (pos + 1) * 2;

      if (id) {
        cfi += '[' + id + ']';
      }
      cfi += '!';
    } else {
      cfi = '/2/8!';
    }

    return cfi;
  };

  EpubCFI.prototype.generateFragment = function(element, chapter) {
    var path = this.pathTo(element);
    var parts = [];

    if (chapter) {
      parts.push(chapter);
    }

    path.forEach(function(part) {
      parts.push((part.index + 1) * 2);
      if (part.id && part.id.slice(0, 6) != 'EPUBJS') {
        parts.push('[' + part.id + ']');
      }
    });

    return parts.join('/');
  };

  EpubCFI.prototype.pathTo = function(node) {
    var stack = [];
    var children;

    while (node && node.parentNode !== null) {
      children = node.parentNode.children;

      stack.unshift({
        'id' : node.id,
        'tagName' : node.tagName,
        'index' : children ? Array.prototype.indexOf.call(children, node) : 0
      });

      node = node.parentNode;
    }

    return stack;
  };

  EpubCFI.prototype.getChapter = function(cfiStr) {

    var splitStr = cfiStr.split('!');

    return splitStr[0];
  };

  EpubCFI.prototype.getFragment = function(cfiStr) {

    var splitStr = cfiStr.split('!');

    return splitStr[1];
  };

  EpubCFI.prototype.getOffset = function(cfiStr) {

    var splitStr = cfiStr.split(':');

    return [splitStr[0], splitStr[1]];
  };

  EpubCFI.prototype.parse = function(cfiStr) {
    var cfi = {};
    var chapId;
    var path;
    var end;
    var text;

    cfi.chapter = this.getChapter(cfiStr);
    cfi.fragment = this.getFragment(cfiStr);
    cfi.spinePos = (parseInt(cfi.chapter.split('/')[2]) / 2 - 1 ) || 0;

    chapId = cfi.chapter.match(/\[(.*)\]/);

    cfi.spineId = chapId ? chapId[1] : false;

    path = cfi.fragment.split('/');
    end = path[path.length-1];
    cfi.sections = [];

    if (parseInt(end) % 2) {
      text = this.getOffset();
      cfi.text = parseInt(text[0]);
      cfi.character = parseInt(text[1]);
      path.pop();
    }

    path.forEach(function(part) {
      var index, has_id, id;
      
      if (!part) {
        return;
      }

      index = parseInt(part) / 2 - 1;
      has_id = part.match(/\[(.*)\]/);

      if (has_id && has_id[1]) {
        id = has_id[1];
      }

      cfi.sections.push({
        index: index,
        id: id || false
      });
    });

    return cfi;
  };

  EpubCFI.prototype.getElement = function(cfi, doc) {
    var  doc = doc || document;
    var sections = cfi.sections;
    var element = doc.getElementsByTagName('html')[0];
    var children = Array.prototype.slice.call(element.children);
    var num;
    var index;
    var part;
    var has_id;
    var id;

    sections.shift();

    while (sections.length > 0) {

      part = sections.shift();

      if (part.id) {
        element = doc.querySelector('#' + part.id);
        if (!element) {
          return;
        }
      } else {
        element = children[part.index];
        if (!children) {
          DEBUG && console.warn('No kids', element);
        }
      }

      if (!element) {
        DEBUG && console.warn('No element for', part);
      } else {
        children = Array.prototype.slice.call(element.children);
      }
    }

    return element;
  };

  // Export.
  return EpubCFI;

});

define(function() {

  var utils = {};

  utils.makeHyphens = function(htmlRoot) {

    var BAD_NODES = {'script': true, 'style': true, 'noscript': true};

    var iterator = document.createNodeIterator(htmlRoot, NodeFilter.SHOW_TEXT,
        function(node) {
        return (BAD_NODES[node.nodeName.toLowerCase()] !== undefined ||
            (node.parentNode !== null && BAD_NODES[
                node.parentNode.nodeName.toLowerCase()] !== undefined)) ?
                    NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
      false
    );

    while ((textNode = iterator.nextNode()) !== null) {
      textNode.textContent = makeHyphens(textNode.textContent);
    }

    function makeHyphens(text) {
      var RusA = '[абвгдеёжзийклмнопрстуфхцчшщъыьэюя]';
      var RusV = '[аеёиоуыэю\я]';
      var RusN = '[бвгджзклмнпрстфхцчшщ]';
      var RusX = '[йъь]';
      var Hyphen = '\xAD';

      var re1 = new RegExp('('+RusX+')('+RusA+RusA+')','ig');
      var re2 = new RegExp('('+RusV+')('+RusV+RusA+')','ig');
      var re3 = new RegExp('('+RusV+RusN+')('+RusN+RusV+')','ig');
      var re4 = new RegExp('('+RusN+RusV+')('+RusN+RusV+')','ig');
      var re5 = new RegExp('('+RusV+RusN+')('+RusN+RusN+RusV+')','ig');
      var re6 = new RegExp('('+RusV+RusN+RusN+')('+RusN+RusN+RusV+')','ig');

      text = text.replace(re1, '$1'+Hyphen+'$2');
      text = text.replace(re2, '$1'+Hyphen+'$2');
      text = text.replace(re3, '$1'+Hyphen+'$2');
      text = text.replace(re4, '$1'+Hyphen+'$2');
      text = text.replace(re5, '$1'+Hyphen+'$2');
      text = text.replace(re6, '$1'+Hyphen+'$2');

      return text;
    }
  }

  return utils;

});

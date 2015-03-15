Monocle.DEBUG = true;

(function () {

  zip.workerScriptsPath = "zip/";

  var request = new XMLHttpRequest();
  request.open("GET", "00.epub", true);
  request.responseType = "blob";
  request.onload = function () {
      new Epub(request.response, function (bookData) {
          Monocle.Reader("reader", bookData);
      });
  };
  request.send();

})();

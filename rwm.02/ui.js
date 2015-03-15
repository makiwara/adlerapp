// Copyright 2013 Yandex LLC. All rights reserved.
// Author: Dmitry Iljinskiy <demx@yandex-team.ru>

require([

  'URI',

  'app',
  'constants',

  '../hooks/default/endnotes',
  '../hooks/default/smartimages',
  '../hooks/default/hyphens'

], function(URI, app, constants) {
  'use strict';

  var url = new URI(location.href);
  var search = url.search(true);
  var bookLocation = search.file.replace('://', '%3A//');
  var format = search.book;
  var contained = !!(parseInt(search.contained));
  var contentDisposition = search['content-disposition'];
  var mimeType = search.mimetype;
  var originalUrl = search.url;

  alert(bookLocation)

  var book = app.getBook({
    bookPath: bookLocation,
    format: format,
    contained: contained
  });

  window.book = book;
    
});
// Copyright (c) 2014 Yandex LLC. All rights reserved.
// Author: Dmitry Iljinskiy <demx@yandex-team.ru>

define(function() {
  'use strict';

  // Constants.
  var CLIENT_ID = 'bkrdr';

  var statistics = {};

  /**
   * Sends statistics for specified |parameter| to server.
   * @param {string} parameter
   * @param {(number|string)=} value
   */
  statistics.send = function(parameter, value) {
    var data = {};
    data[parameter] = value || 1;

    yandex.statistics.send(CLIENT_ID, data);
  };

  // Export.
  return statistics;

});

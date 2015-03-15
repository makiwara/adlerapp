// Copyright (c) 2013 Yandex LLC. All rights reserved.
// Author: Dmitry Iljinskiy <demx@yandex-team.ru>

(function() {
  'use strict';

  requirejs.config({

    baseUrl: '../../js',

    waitSeconds: 0,

    enforceDefine: true,

    map: {
      hooks: {
        default: '../../hooks/default'
      }
    },

    paths: {
      async: '../third_party/async',
      lodash: '../third_party/lodash',
      IPv6: '../third_party/urijs/ipv6',
      punycode: '../third_party/punycode',
      SecondLevelDomains: '../third_party/urijs/second_level_domains',
      URI: '../third_party/urijs/uri',
      RSVP: '../third_party/rsvp/rsvp'
    },

    shim: {
      'RSVP': {
        exports: 'RSVP'
      }
    }
  });

}());

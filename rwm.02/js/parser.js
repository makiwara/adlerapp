define([

  'core'

], function(Core) {

    var Parser = function(baseUrl) {
      this.baseUrl = baseUrl || '';
    }

    Parser.prototype.container = function(containerXml) {
      var rootfile = containerXml.querySelector('rootfile');
      var fullpath = rootfile.getAttribute('full-path');
      var folder = Core.folder(fullpath);

      return {
        'packagePath' : fullpath,
        'basePath' : folder
      };
    }

    Parser.prototype.convertXML = function(packageXml) {
      var request = new window.XMLHttpRequest();  
        
      request.open('GET', '../css/fb2reader.xsl', false);
      request.send(null);

      var xslText = request.responseText;

      function createXMLDoc(xmlText) {
          return (new window.DOMParser()).parseFromString(xmlText, 'text/xml');
      };

      function xslTransform(xml, xsl) {
          if (xml.constructor == String) {
              xml = createXMLDoc(xml);
          };
          if (xsl.constructor == String) {
              xsl = createXMLDoc(xsl);
          };
          var processor = new window.XSLTProcessor();
          processor.importStylesheet(xsl);
          return processor.transformToFragment(xml, document)
      };

      var nodeContent = xslTransform(packageXml, xslText);
      var meta = nodeContent.querySelector('meta');
      nodeContent.removeChild(meta);

      return nodeContent;
    }

    Parser.prototype.package = function(packageXml, baseUrl) {
      var parse = this;

      if (baseUrl) {
        this.baseUrl = baseUrl;
      }

      if (book.settings.format == 'epub') {
        var metadataNode = packageXml.querySelector('metadata');
        var manifestNode = packageXml.querySelector('manifest');
        var spineNode = packageXml.querySelector('spine');

        var manifest = parse.manifest(manifestNode);
        var tocPath = parse.findTocPath(manifestNode);
        var coverPath = parse.findCoverPath(manifestNode);

        var spineNodeIndex = Array.prototype.indexOf.call(spineNode.parentNode.childNodes, spineNode);

        var spine = parse.spine(spineNode, manifest);

        var spineIndexByURL = {};
        spine.forEach(function(item) {
          spineIndexByURL[item.href] = item.index;
        });

        return {
          'metadata' : parse.metadata(metadataNode),
          'spine'    : spine,
          'manifest' : manifest,
          'tocPath'  : tocPath,
          'coverPath': coverPath,
          'spineNodeIndex' : spineNodeIndex,
          'spineIndexByURL' : spineIndexByURL
        };
      } else {
        var formatted = parse.convertXML(packageXml);
        book.size = formatted.textContent.length;

        return {
          'metadata' : parse.metadata(packageXml),
          'formatted' : formatted
        };
      }

    }

    Parser.prototype.findTocPath = function(manifestNode) {
      var node = manifestNode.querySelector('[href$=".ncx"]');
      return node ? node.getAttribute('href') : false;
    }

    Parser.prototype.findCoverPath = function(manifestNode) {
      var node = manifestNode.querySelector('item[properties="cover-image"]');
      if (!node) {
        node = manifestNode.querySelector('item[href*="cover"]');
      }
      return node ? node.getAttribute('href') : false;
    }

    Parser.prototype.metadata = function(xml) {
      var metadata = {};
      var p = this;

      if (book.settings.format == 'epub') {
        metadata.bookTitle = p.getElementText(xml, 'title');
        metadata.creator = p.getElementText(xml, 'creator');
        metadata.description = p.getElementText(xml, 'description');
      } else {
        metadata.bookTitle = p.getElementText(xml, 'book-title');
        metadata.creator = p.getElementText(xml, 'first-name') + ' ' +
            p.getElementText(xml, 'last-name');
        metadata.description = p.getElementText(xml, 'annotation');
      }

      metadata.pubdate = p.getElementText(xml, 'date');

      metadata.publisher = p.getElementText(xml, 'publisher');
      metadata.isbn = p.getElementText(xml, 'isbn');
      metadata.year = p.getElementText(xml, 'year') ||
          p.getElementText(xml, 'date');

      metadata.identifier = p.getElementText(xml, 'identifier');
      metadata.language = p.getElementText(xml, 'language');
      metadata.rights = p.getElementText(xml, 'rights');
      
      metadata.modified_date = p.querySelectorText(xml,
          'meta[property="dcterms:modified"]');
      metadata.layout = p.querySelectorText(xml,
          'meta[property="rendition:orientation"]');
      metadata.orientation = p.querySelectorText(xml,
          'meta[property="rendition:orientation"]');
      metadata.spread = p.querySelectorText(xml,
          'meta[property="rendition:spread"]');
      
      return metadata;
    }

    Parser.prototype.getElementText = function(xml, tag) {
      var found = book.settings.format == 'epub' ?
          xml.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', tag) :
          xml.getElementsByTagNameNS('*', tag);
      var el;

      if (!found || found.length == 0) {
        return '';
      }
      
      el = found[0]; 

      if (el.childNodes.length) {
        return el.childNodes[0].nodeValue;
      }

      return '';
    }

    Parser.prototype.querySelectorText = function(xml, q) {
      var el = xml.querySelector(q);

      if (el && el.childNodes.length) {
        return el.childNodes[0].nodeValue;
      }

      return '';
    }

    Parser.prototype.manifest = function(manifestXml) {
      var baseUrl = this.baseUrl;
      var manifest = {};
      var selected = manifestXml.querySelectorAll('item');
      var items = Array.prototype.slice.call(selected);

      // Create an object with the id as key.
      items.forEach(function(item) {
        var id = item.getAttribute('id');
        var href = item.getAttribute('href') || '';
        var type = item.getAttribute('media-type') || '';

        manifest[id] = {
          'href' : baseUrl + href,
          'type' : type
        };
      });
      
      return manifest;
    }

    Parser.prototype.spine = function(spineXml, manifest) {
      var spine = [];

      var selected = spineXml.getElementsByTagName('itemref');
      var items = Array.prototype.slice.call(selected);

      items.forEach(function(item, index) {
        var Id = item.getAttribute('idref');

        var vert = {
          id: Id,
          linear: item.getAttribute('linear') || '',
          properties: item.getAttribute('properties') || '',
          href: manifest[Id].href,
          index: index
        }

        spine.push(vert);
      });

      return spine;
    }

    Parser.prototype.toc = function(tocXml) {
      var navMap = tocXml.querySelector('navMap');

      function getTOC(parent) {
        var list = [];
        var items = [];
        var nodes = parent.childNodes;
        var nodesArray = Array.prototype.slice.call(nodes);
        var length = nodesArray.length;
        var iter = length;
        var node;

        if (length == 0) {
          return false;
        }

        while (iter--) {
          node = nodesArray[iter];
          if (node.nodeName === 'navPoint') {
            items.push(node);
          }
        }

        items.forEach(function(item) {
          var id = item.getAttribute('id');
          var content = item.querySelector('content');
          var src = content.getAttribute('src');
          var split = src.split('#');
          var navLabel = item.querySelector('navLabel');
          var text = navLabel.textContent ? navLabel.textContent : '';
          var subitems = getTOC(item);

          list.unshift({
            id: id,
            href: src,
            label: text,
            subitems : subitems
          });
        });

        return list;
      }

      return getTOC(navMap);

    }

    // Export.
    return Parser;

});

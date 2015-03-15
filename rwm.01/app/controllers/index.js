'use strict';

exports.render = function(req, res) {
	res.render('index', {});
};

exports.xbook = function(req, res) {
    res.render('book', {});
};


var zlib = require('zlib');
var fs   = require('fs');
var EPub = require("epub");

exports.book = function(req, res) {
    var bookFilename = 'books/00.epub';

    var epub = new EPub(bookFilename);

    epub.on("end", function(){
        // epub is now usable
        console.log(epub.metadata.title);

        console.log("METADATA:\n");
        console.log(epub.metadata);

        console.log("\nSPINE:\n");
        console.log(epub.flow);

        console.log("\nTOC:\n");
        console.log(epub.toc);

        epub.flow.forEach(function(chapter){
            console.log(chapter.id);
        });


        epub.getChapter('id33', function(err, data){
            if(err){
                console.log(err);
                return;
            }
            console.log();
            console.log();
            console.log();
            console.log("\nFIRST CHAPTER:\n");
            console.log(data); // first 512 bytes
        });
    });
    epub.parse();

    res.render('book', {});

};
requirejs.config({
    baseUrl: 'vendor/',
    paths: {
        reading: '../reading'
    }
});

// Start the main app logic.
requirejs(['jquery', 'reading/reader', 'reading/book'],
function ( $, Reader, Book ) {

    var book = new Book({
        // components: [...],
        spine: [
            'toc.html',
            '2.html',
            '1.html',
            '3.html'
        ],
        spinePrefix: 'components/',
        metadata: {
            title: "Three Ghost Stories",
            creator: "Charles Dickens"
        }
    }).load(function(book){
        var r = new Reader($('.reader'), book);
    })



});
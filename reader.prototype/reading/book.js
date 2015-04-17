define([ "jquery" ],
function( $ ) { 

    /* *****************************************************************************************
     *
     *  Book class: contains book data: spine, component contents and metadata.
     *              provides API for accessing components and its content data-wise.
     */

    var Book = function(data) {
        this.data = data;
        this.componentsMeta = [];
        this._loadingCount = 0;
        this._loadCallback = function(){};
        var that = this;
        if (!this.data.components) {
            this.data.components = [];
            for (var i=0; i < this.data.spine.length; i++) {
                if (this.data.spine[i].substr(-5) == '.html') {
                    (function(target){
                        that._loadingCount++;
                        $.ajax({
                            url: (data.spinePrefix || '') + data.spine[target],
                            success: function(result) {
                                data.components[target] = result;
                                if (--that._loadingCount == 0) return that._loadCallback(that);
                            }
                        })
                    })(i)
                }
            }
        }

    }
    Book.prototype = {
        load: function(callback) {
            if (this._loadingCount == 0) return callback(this);
            else this._loadCallback = callback;  
        },
        getComponentAt: function( componentNo ) {
            return this.data.components[ componentNo ];
        },
        getComponentCount: function() {
            return this.data.components.length;
        },
        setPageCount: function( componentNo, pageCount ) {
            this.componentsMeta[componentNo] = this.componentsMeta[componentNo] || {};
            this.componentsMeta[componentNo].pageCount = pageCount;
        },
        getPageCount: function( componentNo, undef ) {
            if (componentNo !== undef) return (this.componentsMeta[componentNo] || {pageCount:1}).pageCount;
            var count = 0;
            for (var i=0; i<this.componentsMeta.length; i++)
                count += this.componentsMeta[i].pageCount;
            return count;
        },
        findComponentNoByUrl: function(url) {
            var url = url.replace(/#.*$/,'');
            for (var i=0; i<this.data.spine.length; i++) {
                if (url.substr(-this.data.spine[i].length) == this.data.spine[i]) {
                    return i;
                }
            }
            return -1;
        }
    }
    return Book;
});
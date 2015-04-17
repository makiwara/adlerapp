define([ "jquery", "reading/place" ],
function( $,        Place ) { 

    CSS_MARKER = '.CHAT';

    /* *****************************************************************************************
     *
     *  Chat and Room classes: stubs at the moment.
     *                         These classes are intended to contain chat engine for the book
     *                         and particular room instances in the book.
     */

    var Chat = function(reader) {
        this.reader = reader;
        this.chats = [];
    }
    Chat.prototype = {
        clean: function() {
            this.chats = [];
        },
        registerChat: function(place) {
            this.chats[ this.chats.length ] = new Room(this, place);
        },
        registerChatsFromPage: function(page) {
            var anchors = page.getAnchors(CSS_MARKER);
            for (var i=0; i<anchors.length; i++) {
                this.registerChat(anchors[i].place);
            }
        },
        getChats: function(place) {
            var result = [];
            for (var i=0; i<this.chats.length; i++)
                if (this.chats[i].getPlace().isEqual(place)) 
                    result[ result.length ] = this.chats[i];
            return result;
        },
        attachTo: function(page, place) {
            this._page = page;
            this._place = place || this._page.place;
            this._page.switchState("chat");
        },
        isAttachedTo: function(place) {
            return this._place && this._place.isEqual(place);
        }
    }

    var Room = function(chat, place) {
        this.chat = chat;
        this.place = place;
    }
    Room.prototype = {
        getPlace: function() { return this.place }
    }

    return Chat;
});
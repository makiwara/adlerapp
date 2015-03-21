define([ "jquery" ],
function( $ ) { 
    var Place = function(book) {
        this.book = book;
        this.componentNo = 0;
        this.pageNo = 1;
        this.overdraft = 0;

        this.log = function (more) { console.log(this.toString(), more||'') }
        this.toString = function() { return ['place(',this.componentNo,',',this.pageNo,')'].join('') }

        this.isEqual = function(otherPlace) {
            return this.overdraft == 0 && otherPlace.overdraft == 0 
                && this.componentNo == otherPlace.componentNo
                && this.pageNo      == otherPlace.pageNo;
        }

        this.getComponentDepth = function() { return (this.pageNo-1)/this.book.getPageCount(this.componentNo); }
        this.setComponentDepth = function(depth) { 
            return this.setPageNo(1+parseInt(depth*this.book.getPageCount(this.componentNo))) 
        }

        this.getComponent   = function() { return this.book.getComponentAt(this.componentNo); }
        this.getComponentNo = function() { return this.componentNo; }
        this.getPageNo      = function() { return this.pageNo; }
        this.isOverdraft    = function() { return this.overdraft != 0; }
        this.isBeginning    = function() { return this.overdraft < 0 || this.pageNo < 1 && this.componentNo == 0 }
        this.isEnd          = function() { 
            return this.overdraft > 0 
                || this.pageNo >= this.book.getPageCount(this.componentNo) 
                && this.componentNo == this.book.getComponentCount()-1;
        }
        this.isBeyondEnd       = function() { return this.overdraft > 0; }
        this.isBeyondBeginning = function() { return this.overdraft < 0; }
        this.isBeyond          = function() { return this.overdraft != 0; }

        this.gotoComponent = function( newComponentNo, newPageNo ) {
            this.componentNo = newComponentNo;
            this.pageNo      = newPageNo || 1;
            this.shift();
            return this;
        }

        this.copy = function(shift) {
            var place = new Place(book);
            place.componentNo = this.componentNo;
            place.pageNo      = this.pageNo;
            place.overdraft   = this.overdraft;
            place.shift(shift);
            return place;
        }  
        this.setPageNo = function(pageNo) {
            this.pageNo = 1;
            this.overdraft = 0;
            return this.shift(pageNo-1);
        }
        this.set = function(componentNo, pageNo) {
            this.pageNo = pageNo;
            this.componentNo = 0;
            this.overdraft = 0;
        }
        this.shift = function(shift) {
            // do no shifting if overdraft in same direction;
            if (this.overdraft*shift > 0) return;
            // 
            this.pageNo += this.overdraft + (shift || 0);
            this.overdraft = 0;
            while (true) {
                if (this.pageNo <= 0) {
                    if (this.isBeginning()) {
                        this.overdraft = this.pageNo-1;
                        this.pageNo = 1;
                        break; 
                    } else {
                        this.componentNo-=1;
                        this.pageNo += this.book.getPageCount(this.componentNo); 
                        continue;
                    }
                }
                if (this.pageNo > this.book.getPageCount(this.componentNo)) {
                    if (this.isEnd()) {
                        this.overdraft = this.pageNo-this.book.getPageCount(this.componentNo)+1;
                        this.pageNo = this.book.getPageCount(this.componentNo);
                        break;                        
                    } else {
                        this.pageNo -= this.book.getPageCount(this.componentNo); 
                        this.componentNo+=1;
                        continue;
                    }
                }
                break;
            }
            return this;
        }
    }
    return Place;
});
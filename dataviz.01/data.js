/* ========================================
  
    Subject to module.

    Functions to prepare raw data.

   ======================================== */
var merge = require('merge');
var fs = require('fs');
var snowball = require('./lib/snowball.js');


function BookManager(options) {
    options = options || {};
    var defaults = {
        dataPath: 'data/',
        maxBlocksPerChapter: 86,
    };
    this.config = merge(defaults, options);
    this.bookMeta = {
        'lectures': {
            language: 'russian',
            chapters: [
                {id: 1, title: 'Лекция 1. 02.03.89 — «Узловые проблемы философии»'},
                {id: 2, title: 'Лекция 2. 16.03.89 — «Логика как форма организации деятельности»'},
                {id: 3, title: 'Лекция 3. 20.04.89 — «Деятельностный подход и рефлексия»'},
                {id: 4, title: 'Лекция 4. 04.05.89 — «Мышление»'},
                {id: 5, title: 'Лекция 5. 11.05.89 — «Принципы деятельностного подхода»'},
                {id: 6, title: 'Лекция 6. 18.05.89 — «Организационно-деятельностная игра (ОДИ)»'},
            ],
        }
    }

}
BookManager.prototype = {
    getBook: function(bookId) {
        return new Book(this, bookId, this.bookMeta[bookId]);
    },
    getDataFilename: function(book, path) {
        return this.config.dataPath+book.id+'/'+path;
    },
}

function Book(bm, bookId, bookMeta) {
    this.manager = bm;
    this.id = bookId;
    this.meta = bookMeta;
    this.vocabulary = new Vocabulary(bm.config.vocabularyOptions);
    this.vocabulary.init( bm.getDataFilename(this, 'keywords.txt') );
}

Book.prototype = {
    getTextFilename: function(chapterId) {
        return this.manager.getDataFilename(this, chapterId+'.txt');
    },
    prepareTexts: function() {
        var stemmer = new snowball(this.meta.language);
        var stem = function(original) {
            stemmer.setCurrent(original);
            stemmer.stem();
            return stemmer.getCurrent();
        }
        //
        this.meta.chapters.map(function(chapter){
            chapter.text = fs.readFileSync( this.getTextFilename(chapter.id), 
                                                          {encoding: 'utf-8'} );
            chapter.lines = chapter.text
                    .split('\n')
                    .map(function(x){ return x.trim() })
                    .filter(function(x){ return x.length > 0 })
            chapter.sentences = chapter.text
                    .replace(/[\.]{2,}/g, '…')
                    .replace(/[\n\?\!]+/g, '.')
                    .split('.')
                    .map(function(x){ return x.trim() })
                    .filter(function(x){ return x.length > 0 });
            ['lines', 'sentences'].map(function(what){
                chapter[what+"_stems"] = chapter[what].map(function(x){ 
                    return x.replace(/[\.\?\!\,\-\–\—\;\:\*\"\'\(\)]+/g,' ')
                            .split(' ')
                            .filter(function(x){ return x.length > 0 })
                            .map(stem);
                })
            });
        }, this);
        // blocks
        var maxLines = Math.max.apply( Math, this.meta.chapters.map(function(chapter){ return chapter.lines.length }));
        this.blockSize = Math.floor(maxLines / this.manager.config.maxBlocksPerChapter)+1;
        this.meta.chapters.map(function(chapter){
            chapter.blocks = []; chapter.blocks_stems = [];
            for (var start = 0; start<chapter.lines.length; start+=this.blockSize) {
                var end = start+this.blockSize;
                if (end >= chapter.lines.length) end = chapter.lines.length;
                chapter.blocks.push( chapter.lines.slice(start,end).join('\n'));
                chapter.blocks_stems.push( chapter.lines_stems.slice(start,end).join(' '));
            }
        }, this)
        //;
    },
    //
    repaint: function() {
        this.vocabulary.resetPaint();
        this.meta.chapters.map(function(chapter){
            ['sentences', 'lines', 'blocks'].map(function(prefix){
                var concepts = {};
                chapter[prefix+"_paint"]    = this.vocabulary.paint(chapter[prefix+"_stems"], concepts);
                chapter[prefix+"_weight"]   = chapter[prefix+"_paint"].map(function(paint){
                    var w=0;
                    for (var i in paint) w+=paint[i].weight;
                    return w;
                })
                chapter[prefix+"_concepts"] = [];
                for (var i in concepts) chapter[prefix+"_concepts"].push(concepts[i])
                chapter[prefix+"_concepts"].sort(weight_sort);
            }, this);
        }, this)
    },
    //
    getTextsForConcept: function(original, level) {
        return this.getTextsForConcepts([original], level)
    },
    //
    getTextsForConcepts: function(originals, level) {
        var concepts = originals.map(function(o){ return this.vocabulary.concepts[o] }, this)
        var result = [];
        this.meta.chapters.map(function(chapter){
            var chapter_result = [];
            for (var i=0; i<chapter[level].length; i++) {
                var weight = 1;
                concepts.map(function(concept){
                    weight = weight * this.vocabulary.calculateWeight(concept.stems, chapter[level][i]);
                }, this)
                if (weight > 0)
                    chapter_result.push({
                        text: chapter[level][i],
                        chapterId: chapter.id,
                        weight: weight * chapter[level+"_weight"][i]
                    })
            }
            chapter_result.sort(weight_sort);
            result.push({
                id: chapter.id,
                texts: chapter_result
            });
        }, this)
        //console.log(result)
        return result;
    },
    getTextsForConceptsFlat: function(originals, level) {
        var texts = [];
        this.getTextsForConcepts(originals, level).map(function(chapter){
            texts = texts.concat(chapter.texts);
        })
        texts.sort(weight_sort)
        return texts;
    }
}



function weight_sort(a,b) { return b.weight - a.weight; }

function Vocabulary(options) {
    options = options || {};
    var defaults = {
        language: 'russian',
        stopWords: "в, без, до, из, к, на, по, о, от, перед, при, через, с, у, за, над, об, под, про, для".split(", ")
    };
    this.config = merge(defaults, options);
    //
    this.concepts = {};
    //
    this.stemmer = new snowball(this.config.language);
    this.stem = function(original) {
        if (original.charAt(0) == "!") return original.substr(1).toLowerCase();
        this.stemmer.setCurrent(original.toLowerCase());
        this.stemmer.stem();
        return this.stemmer.getCurrent();
    }
    this.stems = function(original) {
        return original.split('\n')
                    .map(this.stem, this)
                    .filter(function(t){ return this.config.stopWords.indexOf(t) < 0 }, this)
    }
    //
    this.init = function(filename) {
        var lines = fs.readFileSync( filename, {encoding: 'utf-8'} ).split('\n');
        var concept = '';
        for (var i=0; i<lines.length; i++) {
            var isTerm = lines[i].substr(0,4) == '    ';
            var original = lines[i].trim();
            if (original.length > 0) {
                if (!isTerm) concept = original;
                if (concept != '' && !this.concepts[concept]) {
                    this.concepts[concept] = {
                        original: original, 
                        stems: this.stems(original),
                        terms:[]
                    };
                }
                this.concepts[concept].terms.push({
                    original: original,
                    weight: 0,
                    stems: this.stems(original)
                })
            }
        }
        /*
        for (var i in this.concepts) {
            console.log(i, '\n  ', this.concepts[i].terms.map(function(x){ return x.original; }).join(','))
        }
        */
    }
    // 
    this.resetPaint = function(concepts) {
        var cp = (concepts || this.concepts);
        for (k in cp)
            cp[k].weight =0; 
    }
    this.calculateWeight = function(small, big) {
        var count = 0;
        for (var i in small) 
            if (big.indexOf(small[i]) >= 0) 
                count++;
        var d = count/small.length;
        return d;
    }
    this.paint = function(stem_data, concepts_paint) { 
        var cp = this.concepts;
        return stem_data.map(function(line){
            var result = [];
            for (c in this.concepts) {
                var weight = this.concepts[c].terms
                    .map(function(term){
                        return this.calculateWeight(term.stems, line)
                    }, this)
                    .reduce(function(a,b){ return a+b });
                result.push({concept: this.concepts[c], weight: weight});

                concepts_paint[c] = concepts_paint[c] || { concept: this.concepts[c] };
                concepts_paint[c].weight = (concepts_paint[c].weight || 0) + weight;               
                cp[c].weight += weight;               
            }
            result.sort(weight_sort);
            return result;
        }, this);
    }
    //
    this.print = function(){
        var list = [];
        for (c in this.concepts)
            list.push(this.concepts[c])
        list.sort(weight_sort)
        list.map(function(concept){
            console.log(concept.weight, concept.original)
        }, this)
    }
}
// ==== debug purposes ====

var bm = new BookManager();
var book = bm.getBook('lectures');
book.prepareTexts();
book.repaint();


var result = {
    chapters: [],
    concepts: []
};


book.meta.chapters.map(function(chapter) {
    result.chapters.push({
        id: chapter.id,
        title: chapter.title,
        concepts: chapter.lines_concepts
                    .map(function(one){ return { weight: one.weight, original: one.concept.original } })
                    .filter(function(one){ return one.weight > 0 }),
        blocks_paint: chapter.blocks_paint
                    .map(function(two){ return two
                        .map(function(one) { return { weight: one.weight, original: one.concept.original } }) 
                        .filter(function(one){ return one.weight > 0 })
                    })
    })
})
for (var i in book.vocabulary.concepts) {
    var concept = book.vocabulary.concepts[i];
    result.concepts.push({
        weight: concept.weight,
        original: concept.original
        })
}
result.concepts.sort(weight_sort);
// пересечение посчитаем?
var cc = {};
var cc_chapters = {};
var level = "lines";
book.meta.chapters.map(function(chapter) {
    var cc_one = {};
    chapter[level+"_paint"].map(function(paint){
        var hash_paint = {};
        paint.map(function(x){ hash_paint[x.concept.original] = x.weight });
        for (var i in book.vocabulary.concepts) for (var j in book.vocabulary.concepts) {
            var weight = 0;
            if (hash_paint[i] && hash_paint[j])
                weight = hash_paint[i] * hash_paint[j];
            cc_one[i] = cc_one[i] || {};
            cc[i]     = cc[i] || {};
            cc_one[i][j]  = cc_one[i][j] || 0;
            cc[i][j]  = cc[i][j] || 0;
            cc[i][j] += weight;
            cc_one[i][j] += weight;
        }
    })
    cc_chapters[chapter.id] = cc_one;
})
result.concepts.map(function(concept){
    var list = [];
    var cci = cc[concept.original];
    for (var i in cci) list.push({ original: i, weight: cci[i] });
    list.sort(weight_sort);
    concept.other_concepts = list.filter(function(x){ return x.weight > 0 && x.original != concept.original });
    // texts
    concept.texts = book.getTextsForConceptsFlat([concept.original], 'lines')
                        .filter(function(t, i){ return (i < 4 || t.weight > 7) && i < 10});
    concept.other_concepts.map(function(c){
        c.texts = book.getTextsForConceptsFlat([concept.original, c.original], 'lines')
                        .filter(function(t, i){ return (i < 4 || t.weight > 7) && i < 10});
    }) 
})
result.chapters.map(function(chapter){
    chapter.concepts.map(function(concept_in_chapter){
        var cci = cc_chapters[ chapter.id ][concept_in_chapter.original];
        var list = [];
        for (var i in cci) list.push({ original: i, weight: cci[i] });
        list.sort(weight_sort);
        concept_in_chapter.other_concepts = list.filter(function(x){ return x.weight > 0 && x.original != concept.original });
    })
})



// console.log(result);
// result.chapters.map(function(chapter){
//     console.log()
//     console.log('==========================')
//     console.log(chapter.id, chapter.title);
//     console.log('-------------')
//     chapter.concepts.map(function(concept_in_chapter){
//         console.log(concept_in_chapter.original, concept_in_chapter.weight);    
//     }) 
// })


// var texts = book.getTextsForConcept("Методология", 'sentences');
// var t2 = [];
// texts.map(function(text){
//     t2 = t2.concat(text.texts);
// })
// t2.sort(weight_sort)
// t2
// .filter(function(t, i){ return t.weight > 7 && i < 10})
// .map(function(t){
//     console.log(t.text)
// })



var outputName = bm.getDataFilename(book, 'stats.json');
fs.writeFileSync(outputName, JSON.stringify(result, null, 4), {encoding: 'utf-8'});


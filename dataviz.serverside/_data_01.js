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
        dataPath: 'data/'
    };
    this.config = merge(defaults, options);
    this.bookMeta = {
        'lectures': {
            language: 'russian',
            chapters: [
                {id: 1, title: 'Лекция 1. 02.03.89 — «Узловые проблемы философии»'},
                {id: 2, title: 'Лекция 2. 16.03.89 — «Логика как форма организации деятельности»'},
                {id: 3, title: 'Лекция 3. 20.04.89 — «Деятельностный подход и рефлексия»'},
                {id: 4, title: 'Лекция 4. 04.05.89 – «Мышление»'},
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
        for (var i in this.meta.chapters) {
            this.meta.chapters[i].text = fs.readFileSync( this.getTextFilename(this.meta.chapters[i].id), 
                                                          {encoding: 'utf-8'} );
            this.meta.chapters[i].lines = this.meta.chapters[i].text
                    .split('\n')
                    .map(function(x){ return x.trim() })
                    .filter(function(x){ return x.length > 0 })
            this.meta.chapters[i].sentences = this.meta.chapters[i].text
                    .replace(/[\n\?\!\*]+/g, '.')
                    .split('.')
                    .map(function(x){ return x.trim() })
                    .filter(function(x){ return x.length > 0 });
            ['lines', 'sentences'].map(function(what){
                this.meta.chapters[i][what+"_stems"] = this.meta.chapters[i][what]
                        .map(function(x){ 
                            return x.replace(/[\.\?\!\,\-\–\—\;\:\*\"\'\(\)]+/g,' ')
                                    .split(' ')
                                    .filter(function(x){ return x.length > 0 })
                                    .map(stem);
                        })
            }, this)
        }
    }
}


function Ontology(options) {
    options = options || {};
    var defaults = {
        language: 'russian',
        stopWords: "в, без, до, из, к, на, по, о, от, перед, при, через, с, у, за, над, об, под, про, для".split(", ")
    };
    this.config = merge(defaults, options);
    //
    this.stemmer = new snowball(this.config.language);
    this.stem = function(original) {
        this.stemmer.setCurrent(original);
        this.stemmer.stem();
        return this.stemmer.getCurrent();
    }
    //
    this.terms = {};
    this.addTerm = function(original, initialValue) {
        var t = new OntologyTerm(this, original, initialValue);
        return this.terms[t.stem] = t;
    }
    //
    this.distance = function(small, big) {
        var count = 0;
        for (var i in small) 
            if (big.indexOf(small[i]) >= 0) 
                count++;
        var d = 1-count/small.length;
        return d;
    }
    //
    this.printTerms = function() {
        var list = [];
        for (var t in this.terms) list.push(this.terms[t]);
        list.sort(function(a,b){ 
            if (a.value < b.value) return +1;
            if (a.value > b.value) return -1;
            return 0;
        })
        for (var i in list) {
            console.log(list[i].value, list[i].original);
        }
    }
}

function OntologyTerm(o, original, initialValue) {
    this.o = o;
    this.original = original;
    this.stem = o.stem(original);
    this.stems = original.split(' ')
                    .map(function(t){ return o.stem(t) })
                    .filter(function(t){ return o.config.stopWords.indexOf(t) < 0 })
    this.initialValue = initialValue;
}

function Text(book, chapterNo, ontology) {
    this.book = book;
    this.chapterNo = chapterNo;
    this.ontology = ontology;
    //
    this.paint = function(what) {
        var ontology = this.ontology;
        var by_text = {}, by_term = {};
        this.book.meta.chapters[this.chapterNo][what+"_stems"].map(function(line){
            var result = {}
            for (var t in ontology.terms) {
                var d = ontology.distance( ontology.terms[t].stems, line);
                result[t] = {
                    term: ontology.terms[t],
                    distance: d
                }
                by_term[t] = by_term[t] || 0;
                by_term[t] += 1-d;
            }
            return result;
        })
        for (var i in by_term) {
            this.ontology.terms[i].value =  this.ontology.terms[i].value  || 0;
            this.ontology.terms[i].value += by_term[i];
        }       
    }
    //
}


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
        this.stemmer.setCurrent(original);
        this.stemmer.stem();
        return this.stemmer.getCurrent();
    }
    //
    this.init = function(filename) {
        var lines = fs.readFileSync( filename, {encoding: 'utf-8'} ).split('\n');
        for (var i=0; i<lines.length; i++) {
            var isTerm = lines[i].substr(0,4) == '    ';
            var original = lines[i].trim();


        }
    }
}
// ==== debug purposes ====

var bm = new BookManager();
var book = bm.getBook('lectures');
book.prepareTexts();

/*
var o = new Ontology();
// первого порядка
var terms = {
    2: [ 
        // #1
        'философия', 'человек', 'социальная организация', 'творчество', 'образование', 
        'мышление', 'индивид', 'личность', 'культура', 'позиция', 'объект', 'метод', 
        'система', 'материал', 'кентавр-система', 'естественное', 'искусственное',
        'техническое', 'общество', 'функциональное место', 'структура', 
        'нравственность', 'мораль', 'душа', 'дух',
        // #2
        'теория познания', "методология", "логика", "наука", 
        "онтологическая картина", "схема", "мир",
        "деятельность",
        // #3
        'самоопределение', "рефлексия", "мыслительная работа", "кружок", 
        "рефлексивная возгонка",
        "социальное самоопределение", "социокультурное самоопределение",
        "марксизм", "самость", 
        "деятельностный подход", "принципы",
        "научный подход", "выбор",
        "социальное", "социокультурное",
        // #4
        "интенция", "материализм", "форма движения материи", "субстанция",
        "философ", "оппозиция", "позиция", "теория", "практика", "искусство",
        "содержание", 
        "проектирование", "программирование", "познание",
        "поисковое мышление", "типы мышления", "творческое мышление",
        "спор", "обоснование",
        // #5
        "деятельностная позиция", "активная позиция", "установка на действие",
        "натуральный мир", "социокультурный мир",
        "история", "историческое существование",
        "действие", "тоталитаризм",
        "организационная структура",
        "мысль-коммуникация",
        "мыследеятельность",
        "ОДИ", "имитация",
        // #6
        "проблема", "задача", "игра",
        "организационно-деятельностная игра",
        "сценирование",
        "распредмечивание", "рефлексивный анализ",
        "фиктивно-демонстративное действие"
        ],
    1: [ 
        // #1
        'Кант', 'кантианство', 'Гегель', 'гегельянство', 'траектория',
         'общество', 'идеология', 'смысл жизни', 'социальная структура', 'понимание',
        // #2
        'глубина', 'коммуникация', 'игровая имитация', 'профессия',
        "форма организации", "аксиоматика", "наглядность", "многозначность",
        "гипотеза", "группа", "коллектив",
        // #3
        'самоопределиться', "социум", "рамки", "диалектика", "рефлексивные наблюдения",
        "тезис", "марксистская позиция",
        // #4
        'ответственность', "политика", "плоскость", "знак", "знаковая форма",
        "мысли", "носитель мышления", "правила",
        // #5
        "реальность", "дети", "ребенок", "ученый", "ценности",
        "целевая система", "самооценка",
        // #6
        "творческий человек", "щелевая психология",
        "концентрированная жизнь", "жизнь", "ритуал",
        "государство", "благоглупости"
        ]
};
for (var i in terms) {
    terms[i].map(function(t){ o.addTerm(t, i)})
}


// var t1 = new Text(book, 2, o);
// for (var i=0; i<book.meta.chapters.length; i++) {
//     t1.chapterNo = i;
//     t1.paint('sentences');
// }
// o.printTerms()

*/
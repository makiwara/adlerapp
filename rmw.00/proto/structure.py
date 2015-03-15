# -*- coding: utf-8 -*-
import re
from pprint import pprint



class ProtoText:
    def __init__(self, filename, root):
        self.filename = filename
        self.raw  = ''
        self.read_source()
        self.root = root
        root.set_text(self)
        self.find_structure()

    def set_source(self, source):
        self.raw = source
        self.lines = [y for y in [x.strip() for x in self.raw.split(u'\n')] if len(y) > 0]
        self.glued = u'\n'.join(self.lines)
        sentences = []
        for y in self.lines:
            w = re.split(ur'(?<=\S{3})([\.!?]+)', y)
            if len(w)%2 == 1:
                w.append(u'')
            w[-1] += '\n'
            sentences.extend(w)
        self.sentences = []
        self.sentences_offset = [0]
        for i in range(0,len(sentences)-1, 2):
            self.sentences.append(sentences[i]+sentences[i+1])
            self.sentences_offset.append(self.sentences_offset[-1]+len(sentences[i])+len(sentences[i+1]))

    def read_source(self):
        with open(self.filename) as source:
            self.set_source(source.read())

    def locate(self, what, offset=0):
        lines = self.glued[offset:].split(u'\n')
        o = offset
        for line in lines:
            if what == line:
                return o
            o+= len(line) + 1
        # guess by first sentence
        what_lines = [x.strip() for x in what.split('.')]
        if len(what_lines) > 1:
            return self.locate(what_lines[0], offset)
        else:
            return -1

    def find_structure(self):
        self._offset = 0
        self._offset_prev = None
        self._deeper_offset(self.root)
        if self._offset_prev: 
            self._offset_prev.offset_next = len(self.glued)
        # count size
        def deeper_size(item):
            [deeper_size(x) for x in item.children]
            i = len(item.children)-1
            while i >= 0:
                if item.children[i].size > 0:
                    item.size = item.children[i].offset_next - item.offset
                    break
                i-=1
            if item.size == 0:
                item.size = item.offset_next - item.offset
            if len(item.children) == 0 and item.offset == 0:
                item.size = 0
        deeper_size(self.root)

    def _deeper_offset(self, item):
        new_offset = self.locate(item.title, self._offset)
        if new_offset >= 0:
            self._offset = new_offset
            item.offset = new_offset
            if self._offset_prev: 
                self._offset_prev.offset_next = new_offset
            self._offset_prev = item
        [self._deeper_offset(x) for x in item.children]

    def find_quote(self, offset_start, offset_end, words, limit=0):
        _words = words
        words = re.split(r"\s+", words.lower())
        results = []
        for i in range(0, len(self.sentences)-1):
            if offset_start <= self.sentences_offset[i] and offset_end >= self.sentences_offset[i]:
                found = 0
                sentence = self.sentences[i]
                sentence_words = re.split(r"\s+", sentence.lower())
                for word in words:
                    if len(word) > 0:
                        try:
                            pos = sentence_words.index(word)
                            found += 1
                            del sentence_words[0:pos+1]
                        except ValueError:
                            pass
                if found > 0:
                    results.append(ProtoQuote(
                        text = self,
                        position = i,
                        offset = self.sentences_offset[i],
                        size = len(sentence),
                        params = dict(
                            found = found,
                            pct = float(found)/len(words),
                        ),
                    ))

        results.sort(key=lambda x: x.params['found'], reverse=True)
        results = [x for x in results if x.is_good_enough]
        if limit > 0:
            results = results[:limit]
        return results

class ProtoQuote:
    def __init__(self, text, position, offset, size, params):
        self.text = text
        self.position = position
        self.position_size = 1
        self.offset = offset
        self.size = size
        self.params = params

    @property
    def is_good_enough(self):
        return self.params["pct"] > 0.8

    @property
    def contents(self):
        return self.text.glued[ self.offset : self.offset+self.size ].strip()

    def extend(self, left=False, right=False):
        if left:
            self.position -= 1
            self.position_size += 1
            self.offset = self.text.sentences_offset[ self.position ]
            self.size += len(self.text.sentences[ self.position ])
        if right:
            self.position_size += 1
            self.size += len(self.text.sentences[ self.position+self.position_size-1 ])

    def out(self):
        print '(%d%%, %d, %d) %s' % (int(self.params['pct']*100), self.position_size, self.size, self.contents) 


class ProtoStructure:
    def __init__(self, title='', level=1, is_milestone=True, parent=None):
        self.title = title
        self.level = level
        self.is_milestone = is_milestone
        self.parent = parent
        self.children = []
        self.pos   = None
        self.text  = None
        self.offset = 0
        self.offset_next = 0
        self.size = 0

    def set_text(self, text):
        self.text = text
        [x.set_text(text) for x in self.children]

    def find_quote(self, line, limit=0):
        return self.text.find_quote(self.offset, self.offset+self.size, line, limit)

    @property
    def last_child(self):
        if len(self.children) > 0:
            return self.children[ len(self.children)-1 ]
        else:
            return self

    def add_child(self, child):
        child.parent = self
        child.level  = self.level+1
        self.children.append(child)

    def out(self):
        # print line
        print ''.join([
            (''.ljust(self.level*4, ' ')+self.title).ljust(120, '.'),
            '*' if self.is_milestone else ' ',
            ' ', 
            str(self.offset),
            '—%s (%s)' % (str(self.offset_next), str(self.size)),
            ])
        # show text in the beginning and in the end
        if self.size > 0:
            print '           ', self.text.glued[ self.offset:self.offset+100 ].replace(u'\n', u'. '),'...'
            print '           ...', self.text.glued[ self.offset+self.size-100:self.offset+self.size ].replace(u'\n', u'. ')
        else:
            print
        # go for children
        [x.out() for x in self.children]


def init_struct(title, data):
    items = [ ProtoStructure(title=x[2], level=x[1], is_milestone=x[0]) for x in data ]
    root = ProtoStructure(title=title, level=0)
    parent = root
    for item in items:
        if item.level <= parent.level:
            parent = parent.parent
        if item.level > parent.level+1:
            parent = parent.last_child
        parent.add_child(item)
    return root


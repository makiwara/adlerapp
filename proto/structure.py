# -*- coding: utf-8 -*-


class ProtoText:
    def __init__(self, filename, root):
        self.filename = filename
        self.raw  = ''
        self.read_source()
        self.root = root
        root.set_text(self)
        self.find_structure()

    def read_source(self):
        with open(self.filename) as source:
            self.raw = source.read()
        self.lines = [y for y in [x.strip() for x in self.raw.split('\n')] if len(y) > 0]
        self.glued = u'\n'.join(self.lines)

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


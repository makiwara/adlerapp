# -*- coding: utf-8 -*-
import sys;reload(sys);sys.setdefaultencoding('utf-8'); 
import os
import sys

structures_input = {
        # is_milestone, level, title
    '1.txt': [
        [False, 1, u'Предисловие'],
        [False, 1, u'От издателей'],
        [False, 1, u'От автора'],
        [True,  1, u'Часть I. Чтение как деятельность'],
        [True,  2, u'Глава первая. Обычному читателю'],
        [True,  2, u'Глава вторая. Прочтение слова «чтение»'],
        [True,  2, u'Глава третья. Чтение — это учёба'],
        [True,  2, u'Глава четвертая. Учителя: одушевленные и неодушевленные'],
        [True,  2, u'Глава пятая. Несостоятельность школ'],
        [True,  2, u'Глава шестая. О самосовершенствовании'],
        [True,  1, u'Часть II. Правила'],
        [True,  2, u'Глава седьмая. От множества правил к единому навыку'],
        [True,  2, u'Глава восьмая. Ориентируйтесь по названию'],
        [True,  2, u'Глава девятая. Разглядите скелет'],
        [True,  2, u'Глава десятая. Найдите общий язык'],
        [True,  2, u'Глава одиннадцатая. Каковы утверждения?'],
        [True,  2, u'Глава двенадцатая. Этикет интеллектуальной беседы'],
        [True,  2, u'Глава тринадцатая. Что может сказать читатель'],
        [True,  2, u'Глава четырнадцатая. И снова правила'],
        [True,  1, u'Часть III. Другие стороны жизни читателя'],
        [True,  2, u'Глава пятнадцатая. Вторая половина'],
        [True,  2, u'Глава шестнадцатая. Великие книги'],
        [True,  2, u'Глава семнадцатая. Свободный ум и свободные граждане'],
        [False, 1, u'Приложение 1. Великие книги'],
        [False, 1, u'Приложение 2. 102 великие идеи человечества'],
        [False, 1, u'Об авторе'],
        [False, 1, u'Именной указатель'],
    ],
    # ====
    '2.txt': [
        [False, 1, u'Предисловие'],
        [True,  1, u'Глава первая. Проблема и метод исследования.'],
        [True,  2, u'I'],
        [True,  1, u'Глава вторая. Проблема речи и мышления ребенка в учении Ж.Пиаже.'],
        [True,  2, u'I'],
        [True,  2, u'II'],
        [True,  2, u'III'],
        [True,  2, u'IV'],
        [True,  2, u'V'],
        [True,  2, u'VI'],
        [True,  2, u'VII'],
        [True,  2, u'VIII'],
        [True,  2, u'IX'],
        [True,  1, u'Глава третья. Проблема развития речи в учении В.Штерна.'],
        [True,  1, u'Глава четвертая. Генетические корни мышления и речи.'],
        [True,  2, u'I'],
        [True,  2, u'II'],
        [True,  2, u'III'],
        [True,  2, u'IV'],
        [True,  1, u'Глава пятая. Экспериментальное исследование развития понятий.'],
        [True,  2, u'I'],
        [True,  2, u'II'],
        [True,  2, u'III'],
        [True,  2, u'IV'],
        [True,  2, u'V'],
        [True,  2, u'VI'],
        [True,  2, u'VII'],
        [True,  2, u'VIII'],
        [True,  2, u'IX'],
        [True,  2, u'X'],
        [True,  2, u'XII'],
        [True,  2, u'XIII'],
        [True,  2, u'XIV'],
        [True,  2, u'XV'],
        [True,  2, u'XVI'],
        [True,  2, u'XVII'],
        [True,  2, u'XVIII'],
        [True,  1, u'Глава шестая. Исследование развития научных понятий в детском возрасте. Опыт построения рабочей гипотезы.'],
        [True,  2, u'I'],
        [True,  2, u'II'],
        [True,  2, u'III'],
        [True,  2, u'IV'],
        [True,  2, u'V'],
        [True,  2, u'VI'],
        [True,  1, u'Глава седьмая. Мысль и слово.'],
        [False, 1, u'Литература.'],
        [False, 1, u'Текстологический комментарий.'],
        [False, 1, u'И.В.Пешков. Еще раз «Мышление и речь», или о предмете риторики.'],
        [False, 1, u'Именной указатель'],
    ]
}


class ProtoStructure:
    def __init__(self, title='', level=1, is_milestone=True, parent=None):
        self.title = title
        self.level = level
        self.is_milestone = is_milestone
        self.parent = parent
        self.children = []
        self.start = 0
        self.end   = 0

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
        print ''.join([
            (''.ljust(self.level*4, ' ')+self.title).ljust(120, '.'),
            '*'if self.is_milestone else ' ',
            ])
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




###### ----------
s1 = init_struct(u'Мортимер Адлер, Как читать книги', structures_input['1.txt'])
s2 = init_struct(u'Лев Выготский, Мышление и речь', structures_input['2.txt'])

print
print
print
print
print
print
print
print
print
print
s1.out()
print
print '======================================='
print
s2.out()

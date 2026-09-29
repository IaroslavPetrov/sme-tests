#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для парсинга вопросов из test_sme.txt в questions-data.js
"""

import json

def parse_questions(input_file):
    """Парсит вопросы из текстового файла"""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    
    questions = []
    current_question = None
    current_answers = []
    
    for line in lines:
        line = line.strip()
        
        # Пропускаем пустые строки и заголовки
        if not line or line.startswith('СОВР'):
            continue
        
        # Начало нового вопроса
        if line.startswith('#'):
            # Сохраняем предыдущий вопрос
            if current_question and current_answers:
                questions.append({
                    'id': len(questions) + 1,
                    'question': current_question,
                    'answers': current_answers
                })
            
            # Начинаем новый вопрос
            current_question = line[1:].strip()
            current_answers = []
        
        # Добавляем ответ
        elif line.startswith('+') or line.startswith('-'):
            is_correct = line.startswith('+')
            answer_text = line[1:].strip()
            
            if answer_text:
                current_answers.append({
                    'text': answer_text,
                    'correct': is_correct
                })
    
    # Добавляем последний вопрос
    if current_question and current_answers:
        questions.append({
            'id': len(questions) + 1,
            'question': current_question,
            'answers': current_answers
        })
    
    return questions

def create_js_file(questions, output_file):
    """Создаёт JavaScript файл с данными"""
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('// Данные вопросов для тестов СМЭ\n')
        f.write('// Сгенерировано автоматически скриптом parse_questions.py\n')
        f.write('const QUESTIONS_DATA = ')
        json.dump(questions, f, ensure_ascii=False, indent=4)
        f.write(';\n')
    
    print(f"✓ Создан файл {output_file}")
    print(f"✓ Всего вопросов: {len(questions)}")

if __name__ == '__main__':
    print("=" * 60)
    print("Парсинг вопросов из test_sme.txt")
    print("=" * 60)
    
    questions = parse_questions('test_sme.txt')
    create_js_file(questions, 'questions-data.js')
    
    print("\nГотово! Теперь можно открыть index.html в браузере.")

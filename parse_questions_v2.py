#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсер вопросов v2 - понимает многострочные вопросы
"""

import json

def parse_questions(input_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    
    questions = []
    current_question_lines = []
    current_answers = []
    in_question = False
    
    for line in lines:
        line = line.strip()
        
        # Пропускаем пустые строки и заголовки
        if not line or line.startswith('СОВР'):
            continue
        
        # Начало нового вопроса
        if line.startswith('#'):
            # Сохраняем предыдущий вопрос
            if current_question_lines and current_answers:
                question_text = ' '.join(current_question_lines)
                questions.append({
                    'id': len(questions) + 1,
                    'question': question_text,
                    'answers': current_answers
                })
            
            # Начинаем новый вопрос
            current_question_lines = [line[1:].strip()]
            current_answers = []
            in_question = True
        
        # Если мы внутри вопроса и строка не ответ - добавляем к вопросу
        elif in_question and not line.startswith('+') and not line.startswith('-'):
            current_question_lines.append(line)
        
        # Добавляем ответ
        elif line.startswith('+') or line.startswith('-'):
            in_question = False  # Вопрос закончился, начались ответы
            is_correct = line.startswith('+')
            answer_text = line[1:].strip()
            
            if answer_text:
                current_answers.append({
                    'text': answer_text,
                    'correct': is_correct
                })
    
    # Добавляем последний вопрос
    if current_question_lines and current_answers:
        question_text = ' '.join(current_question_lines)
        questions.append({
            'id': len(questions) + 1,
            'question': question_text,
            'answers': current_answers
        })
    
    return questions

def create_js_file(questions, output_file):
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('// Данные вопросов для тестов СМЭ\n')
        f.write('// Сгенерировано автоматически скриптом parse_questions_v2.py\n')
        f.write('const QUESTIONS_DATA = ')
        json.dump(questions, f, ensure_ascii=False, indent=4)
        f.write(';\n')
    
    print(f"✓ Создан файл {output_file}")
    print(f"✓ Всего вопросов: {len(questions)}")

if __name__ == '__main__':
    print("=" * 60)
    print("Парсинг вопросов из test_sme.txt (версия 2)")
    print("=" * 60)
    
    questions = parse_questions('test_sme.txt')
    create_js_file(questions, 'questions-data.js')
    
    print("\nГотово!")

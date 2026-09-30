import json
import re

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
        if not line or line.startswith('СОВР.'):
            continue
        
        # Проверка: начинается ли строка с номера вопроса (например, "1. ")
        if re.match(r'^\d+\.\s', line):
            # Сохраняем предыдущий вопрос, если он есть
            if current_question_lines and current_answers:
                question_text = ' '.join(current_question_lines).strip()
                correct_count = sum(1 for a in current_answers if a['correct'])
                questions.append({
                    'id': len(questions) + 1,
                    'question': question_text,
                    'answers': current_answers,
                    'hasMultipleCorrect': correct_count > 1
                })
            
            # Начинаем новый вопрос (убираем "1. " из начала)
            current_question_lines = [re.sub(r'^\d+\.\s*', '', line)]
            current_answers = []
            in_question = True
        
        # Если мы внутри вопроса и это не ответ - добавляем строку к тексту вопроса
        elif in_question and not line.startswith('+') and not line.startswith('-'):
            current_question_lines.append(line)
        
        # Если это ответ
        elif line.startswith('+') or line.startswith('-'):
            in_question = False
            is_correct = line.startswith('+')
            
            # Убираем + или -, и удаляем точки/точки с запятой в конце
            answer_text = line[1:].strip()
            answer_text = re.sub(r'[;\.]+$', '', answer_text).strip()
            
            if answer_text:
                current_answers.append({
                    'text': answer_text,
                    'correct': is_correct
                })
    
    # Не забываем сохранить самый последний вопрос
    if current_question_lines and current_answers:
        question_text = ' '.join(current_question_lines).strip()
        correct_count = sum(1 for a in current_answers if a['correct'])
        questions.append({
            'id': len(questions) + 1,
            'question': question_text,
            'answers': current_answers,
            'hasMultipleCorrect': correct_count > 1
        })
    
    return questions

def create_js_file(questions, output_file):
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('// Данные вопросов для тестов СМЭ\n')
        f.write('// Сгенерировано автоматически скриптом parse_questions_v3.py\n')
        f.write('const QUESTIONS_DATA = ')
        json.dump(questions, f, ensure_ascii=False, indent=4)
        f.write(';\n')
    
    print(f"✓ Создан файл {output_file}")
    print(f"✓ Всего вопросов: {len(questions)}")
    
    multi_count = sum(1 for q in questions if q['hasMultipleCorrect'])
    print(f"✓ Вопросов с несколькими правильными ответами: {multi_count}")

if __name__ == '__main__':
    print("=" * 60)
    print("Парсинг вопросов (версия 3: очистка знаков, мульти-ответы)")
    print("=" * 60)
    questions = parse_questions('test_sme.txt')
    create_js_file(questions, 'questions-data.js')
    print("\nГотово!")

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)

TOKENS_FILE = 'tokens.json'
STATS_DIR = 'statistics'

os.makedirs(STATS_DIR, exist_ok=True)

# Инициализация токенов
if not os.path.exists(TOKENS_FILE):
    initial_tokens = {
        "natalia-p-2024": {
            "name": "Наталья П.",
            "created": datetime.now().isoformat(),
            "active": True,
            "is_admin": True
        }
    }
    with open(TOKENS_FILE, 'w', encoding='utf-8') as f:
        json.dump(initial_tokens, f, ensure_ascii=False, indent=2)
    print("Создан файл tokens.json с токеном для Натальи П.")

def load_tokens():
    with open(TOKENS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_tokens(tokens):
    with open(TOKENS_FILE, 'w', encoding='utf-8') as f:
        json.dump(tokens, f, ensure_ascii=False, indent=2)

@app.route('/api/token/validate', methods=['POST'])
def validate_token():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    if token in tokens and tokens[token]['active']:
        return jsonify({
            'valid': True,
            'user': tokens[token]['name'],
            'is_admin': tokens[token].get('is_admin', False)
        })
    return jsonify({'valid': False, 'message': 'Недействительный токен'})

@app.route('/api/statistics/save', methods=['POST'])
def save_statistics():
    data = request.json
    token = data.get('token')
    ticket_id = data.get('ticket_id')
    score = data.get('score')
    wrong_count = data.get('wrong_count')
    percentage = data.get('percentage')
    
    tokens = load_tokens()
    if token not in tokens:
        return jsonify({'error': 'Недействительный токен'}), 403
    
    stats_file = os.path.join(STATS_DIR, f'{token}.json')
    if os.path.exists(stats_file):
        with open(stats_file, 'r', encoding='utf-8') as f:
            stats = json.load(f)
    else:
        stats = {'user': tokens[token]['name'], 'attempts': []}
    
    attempt = {
        'ticket_id': ticket_id,
        'score': score,
        'wrong_count': wrong_count,
        'percentage': percentage,
        'timestamp': datetime.now().isoformat()
    }
    stats['attempts'].append(attempt)
    
    with open(stats_file, 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    
    return jsonify({'success': True})

@app.route('/api/statistics/load', methods=['POST'])
def load_statistics():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    if token not in tokens:
        return jsonify({'error': 'Недействительный токен'}), 403
    
    stats_file = os.path.join(STATS_DIR, f'{token}.json')
    if os.path.exists(stats_file):
        with open(stats_file, 'r', encoding='utf-8') as f:
            stats = json.load(f)
        return jsonify(stats)
    return jsonify({'user': tokens[token]['name'], 'attempts': []})

@app.route('/api/tokens/list', methods=['GET'])
def list_tokens():
    tokens = load_tokens()
    result = {}
    for token, info in tokens.items():
        result[token] = {
            'name': info['name'],
            'active': info['active'],
            'is_admin': info.get('is_admin', False),
            'created': info.get('created', '')
        }
    return jsonify(result)

@app.route('/api/token/create', methods=['POST'])
def create_token():
    data = request.json
    name = data.get('name')
    admin_token = data.get('admin_token')
    
    if not name:
        return jsonify({'error': 'Имя обязательно'}), 400
    
    # Проверяем, что запрос от админа
    tokens = load_tokens()
    if admin_token not in tokens or not tokens[admin_token].get('is_admin', False):
        return jsonify({'error': 'Доступ запрещён'}), 403
    
    # Генерируем токен
    token = f"{name.lower().replace(' ', '-')}-{uuid.uuid4().hex[:8]}"
    tokens[token] = {
        'name': name,
        'created': datetime.now().isoformat(),
        'active': True,
        'is_admin': False
    }
    save_tokens(tokens)
    return jsonify({'token': token, 'name': name})

@app.route('/api/token/deactivate', methods=['POST'])
def deactivate_token():
    data = request.json
    token_to_deactivate = data.get('token')
    admin_token = data.get('admin_token')
    
    tokens = load_tokens()
    
    if admin_token not in tokens or not tokens[admin_token].get('is_admin', False):
        return jsonify({'error': 'Доступ запрещён'}), 403
    
    if token_to_deactivate not in tokens:
        return jsonify({'error': 'Токен не найден'}), 404
    
    if tokens[token_to_deactivate].get('is_admin', False):
        return jsonify({'error': 'Нельзя деактивировать админа'}), 403
    
    tokens[token_to_deactivate]['active'] = False
    save_tokens(tokens)
    return jsonify({'success': True})

@app.route('/api/token/activate', methods=['POST'])
def activate_token():
    data = request.json
    token_to_activate = data.get('token')
    admin_token = data.get('admin_token')
    
    tokens = load_tokens()
    
    if admin_token not in tokens or not tokens[admin_token].get('is_admin', False):
        return jsonify({'error': 'Доступ запрещён'}), 403
    
    if token_to_activate not in tokens:
        return jsonify({'error': 'Токен не найден'}), 404
    
    tokens[token_to_activate]['active'] = True
    save_tokens(tokens)
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let questions = [];
let tickets = [];
let currentTicket = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let statistics = {};
let currentUserToken = null;
let currentUserName = null;
let currentUserIsAdmin = false;

const API_BASE = 'http://201.34.156.14:5002';

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', function() {
    if (typeof QUESTIONS_DATA !== 'undefined') {
        questions = QUESTIONS_DATA;
    } else {
        questions = [];
    }
    createTickets();
    showLoginScreen();
});

// === СОЗДАНИЕ БИЛЕТОВ ===
function createTickets() {
    const questionsPerTicket = 50;
    const totalTickets = Math.ceil(questions.length / questionsPerTicket);
    tickets = [];
    for (let i = 0; i < totalTickets; i++) {
        const start = i * questionsPerTicket;
        const end = Math.min(start + questionsPerTicket, questions.length);
        tickets.push({
            id: i + 1,
            questions: questions.slice(start, end)
        });
    }
}

// === ЭКРАН ВХОДА ===
function showLoginScreen() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="login-screen">
            <h2>Вход в систему тестирования</h2>
            <p>Введите ваш токен доступа</p>
            <input type="text" id="tokenInput" placeholder="Введите токен" class="token-input">
            <button class="btn btn-primary" onclick="validateToken()">Войти</button>
            <div id="loginError" class="error-message"></div>
        </div>
    `;
    document.getElementById('tokenInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') validateToken();
    });
    document.getElementById('tokenInput').focus();
}

// === ПРОВЕРКА ТОКЕНА ===
async function validateToken() {
    const token = document.getElementById('tokenInput').value.trim();
    const errorDiv = document.getElementById('loginError');
    
    if (!token) {
        errorDiv.textContent = 'Введите токен';
        return;
    }
    
    errorDiv.textContent = 'Проверка...';
    
    try {
        const response = await fetch(`${API_BASE}/api/token/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        
        const data = await response.json();
        
        if (data.valid) {
            currentUserToken = token;
            currentUserName = data.user;
            currentUserIsAdmin = data.is_admin || false;
            await loadUserStatistics();
            showMainMenu();
        } else {
            errorDiv.textContent = data.message || 'Недействительный токен';
        }
    } catch (error) {
        errorDiv.textContent = 'Ошибка подключения к серверу. Проверьте интернет.';
        console.error(error);
    }
}

// === ЗАГРУЗКА СТАТИСТИКИ ===
async function loadUserStatistics() {
    try {
        const response = await fetch(`${API_BASE}/api/statistics/load`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: currentUserToken })
        });
        
        const data = await response.json();
        statistics = {};
        
        if (data.attempts) {
            data.attempts.forEach(attempt => {
                const tid = attempt.ticket_id;
                if (!statistics[tid]) {
                    statistics[tid] = { attempts: 0, bestScore: 0, bestWrong: 100 };
                }
                statistics[tid].attempts++;
                if (attempt.percentage > statistics[tid].bestScore) {
                    statistics[tid].bestScore = attempt.percentage;
                    statistics[tid].bestWrong = attempt.wrong_count;
                }
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// === СОХРАНЕНИЕ СТАТИСТИКИ ===
async function saveUserStatistics(ticketId, score, wrongCount, percentage) {
    try {
        await fetch(`${API_BASE}/api/statistics/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: currentUserToken,
                ticket_id: ticketId,
                score: score,
                wrong_count: wrongCount,
                percentage: percentage
            })
        });
    } catch (error) {
        console.error('Ошибка сохранения статистики:', error);
    }
}

// === ГЛАВНОЕ МЕНЮ ===
function showMainMenu() {
    const app = document.getElementById('app');
    const completedCount = Object.keys(statistics).length;
    const totalAttempts = Object.values(statistics).reduce((sum, s) => sum + s.attempts, 0);

    let ticketsHtml = '<div class="tickets-grid">';
    tickets.forEach(ticket => {
        const stat = statistics[ticket.id];
        const completedClass = stat ? ' completed' : '';
        const badge = stat ? `<div class="badge">${stat.bestScore}%</div>` : '';
        ticketsHtml += `
            <div class="ticket-card${completedClass}" onclick="startTicket(${ticket.id})">
                ${badge}
                <div class="ticket-number">Билет ${ticket.id}</div>
                <div class="ticket-info">${ticket.questions.length} вопросов</div>
            </div>
        `;
    });
    ticketsHtml += '</div>';

    const adminButton = currentUserIsAdmin 
        ? `<button class="btn btn-admin" onclick="showAdminPanel()">⚙️ Админ-панель</button>` 
        : '';

    app.innerHTML = `
        <div class="main-menu">
            <div class="user-info">
                <div class="user-name">👤 ${currentUserName}</div>
                <div class="user-actions">
                    ${adminButton}
                    <button class="btn btn-secondary btn-small" onclick="logout()">Выйти</button>
                </div>
            </div>
            
            <div class="stats-panel">
                <div class="stat">
                    <div class="stat-value">${questions.length}</div>
                    <div class="stat-label">Всего вопросов</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${tickets.length}</div>
                    <div class="stat-label">Билетов</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${completedCount}</div>
                    <div class="stat-label">Пройдено</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${totalAttempts}</div>
                    <div class="stat-label">Попыток</div>
                </div>
            </div>

            <h2>Режимы тестирования</h2>
            <div class="random-mode-card" onclick="startTicket('random')">
                <div class="cat-icon">🎲</div>
                <div class="ticket-number">Случайные 50 вопросов</div>
                <div class="ticket-info">Перемешивает все ${questions.length} вопросов и выбирает 50</div>
            </div>

            <h2>Или выберите конкретный билет</h2>
            ${ticketsHtml}

            <div class="categories-info">
                <h2>Система категорий</h2>
                <div class="category-card senior">
                    <div class="cat-icon">🏆</div>
                    <div class="cat-name">Senior СМЭ</div>
                    <div class="cat-desc">Не более 5 ошибок</div>
                </div>
                <div class="category-card middle">
                    <div class="cat-icon">⭐</div>
                    <div class="cat-name">Middle СМЭ</div>
                    <div class="cat-desc">Не более 10 ошибок</div>
                </div>
                <div class="category-card junior">
                    <div class="cat-icon">📚</div>
                    <div class="cat-name">Junior СМЭ</div>
                    <div class="cat-desc">Не более 15 ошибок</div>
                </div>
            </div>
        </div>
    `;
}

// === АДМИН-ПАНЕЛЬ ===
async function showAdminPanel() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="admin-panel">
            <div class="admin-header">
                <h2>⚙️ Админ-панель</h2>
                <button class="btn btn-secondary" onclick="showMainMenu()">← Назад</button>
            </div>

            <div class="admin-section">
                <h3>Создать новый токен</h3>
                <div class="admin-form">
                    <input type="text" id="newUserName" placeholder="Введите имя пользователя (например: Иван Сидоров)" class="admin-input">
                    <button class="btn btn-primary" onclick="createNewToken()">Создать токен</button>
                </div>
                <div id="newTokenResult" class="token-result"></div>
            </div>

            <div class="admin-section">
                <h3>Список токенов</h3>
                <div id="tokensList" class="tokens-list">Загрузка...</div>
            </div>
        </div>
    `;
    await loadTokensList();
}

// === ЗАГРУЗКА СПИСКА ТОКЕНОВ ===
async function loadTokensList() {
    const listDiv = document.getElementById('tokensList');
    try {
        const response = await fetch(`${API_BASE}/api/tokens/list`);
        const tokens = await response.json();
        
        let html = '<table class="tokens-table"><thead><tr><th>Имя</th><th>Токен</th><th>Статус</th><th>Действия</th></tr></thead><tbody>';
        
        for (const [token, info] of Object.entries(tokens)) {
            const statusClass = info.active ? 'status-active' : 'status-inactive';
            const statusText = info.active ? 'Активен' : 'Неактивен';
            const adminBadge = info.is_admin ? ' <span class="admin-badge">Админ</span>' : '';
            
            let actionButtons = '';
            if (!info.is_admin) {
                if (info.active) {
                    actionButtons = `<button class="btn btn-danger btn-small" onclick="deactivateToken('${token}')">Деактивировать</button>`;
                } else {
                    actionButtons = `<button class="btn btn-success btn-small" onclick="activateToken('${token}')">Активировать</button>`;
                }
            } else {
                actionButtons = '<span class="protected-text">Защищён</span>';
            }
            
            html += `
                <tr>
                    <td>${info.name}${adminBadge}</td>
                    <td class="token-cell"><code>${token}</code></td>
                    <td><span class="${statusClass}">${statusText}</span></td>
                    <td>${actionButtons}</td>
                </tr>
            `;
        }
        html += '</tbody></table>';
        listDiv.innerHTML = html;
    } catch (error) {
        listDiv.innerHTML = '<div class="error-message">Ошибка загрузки списка токенов</div>';
        console.error(error);
    }
}

// === СОЗДАНИЕ НОВОГО ТОКЕНА ===
async function createNewToken() {
    const nameInput = document.getElementById('newUserName');
    const resultDiv = document.getElementById('newTokenResult');
    const name = nameInput.value.trim();
    
    if (!name) {
        resultDiv.innerHTML = '<div class="error-message">Введите имя пользователя</div>';
        return;
    }
    
    resultDiv.innerHTML = '<div class="loading">Создание токена...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/api/token/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, admin_token: currentUserToken })
        });
        
        const data = await response.json();
        
        if (data.token) {
            resultDiv.innerHTML = `
                <div class="success-message">
                    <div>Токен успешно создан!</div>
                    <div class="token-display">
                        <strong>Имя:</strong> ${data.name}<br>
                        <strong>Токен:</strong> <code id="generatedToken">${data.token}</code>
                        <button class="btn btn-small btn-copy" onclick="copyToken('${data.token}')"> Копировать</button>
                    </div>
                    <div class="token-hint">Сохраните этот токен — он понадобится пользователю для входа</div>
                </div>
            `;
            nameInput.value = '';
            await loadTokensList();
        } else {
            resultDiv.innerHTML = `<div class="error-message">${data.error || 'Ошибка создания токена'}</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = '<div class="error-message">Ошибка подключения к серверу</div>';
        console.error(error);
    }
}

// === КОПИРОВАНИЕ ТОКЕНА ===
function copyToken(token) {
    navigator.clipboard.writeText(token).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Скопировано!';
        setTimeout(() => { btn.textContent = originalText; }, 2000);
    }).catch(() => {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = token;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Токен скопирован: ' + token);
    });
}

// === ДЕАКТИВАЦИЯ ТОКЕНА ===
async function deactivateToken(token) {
    if (!confirm('Вы уверены, что хотите деактивировать этот токен? Пользователь не сможет войти в систему.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/token/deactivate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, admin_token: currentUserToken })
        });
        
        const data = await response.json();
        
        if (data.success) {
            await loadTokensList();
        } else {
            alert(data.error || 'Ошибка деактивации');
        }
    } catch (error) {
        alert('Ошибка подключения к серверу');
        console.error(error);
    }
}

// === АКТИВАЦИЯ ТОКЕНА ===
async function activateToken(token) {
    try {
        const response = await fetch(`${API_BASE}/api/token/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, admin_token: currentUserToken })
        });
        
        const data = await response.json();
        
        if (data.success) {
            await loadTokensList();
        } else {
            alert(data.error || 'Ошибка активации');
        }
    } catch (error) {
        alert('Ошибка подключения к серверу');
        console.error(error);
    }
}

// === ВЫХОД ===
function logout() {
    currentUserToken = null;
    currentUserName = null;
    currentUserIsAdmin = false;
    statistics = {};
    showLoginScreen();
}

// === НАЧАЛО ТЕСТА ===
function startTicket(ticketId) {
    if (ticketId === 'random') {
        const shuffled = [...questions].sort(() => 0.5 - Math.random());
        currentTicket = {
            id: 'random',
            questions: shuffled.slice(0, 50)
        };
    } else {
        currentTicket = tickets.find(t => t.id === ticketId);
    }
    currentQuestionIndex = 0;
    userAnswers = new Array(currentTicket.questions.length).fill(null);
    showQuestion();
}

// === ПОКАЗ ВОПРОСА ===
function showQuestion() {
    const question = currentTicket.questions[currentQuestionIndex];
    const app = document.getElementById('app');
    const progress = ((currentQuestionIndex + 1) / currentTicket.questions.length) * 100;
    const isLast = currentQuestionIndex === currentTicket.questions.length - 1;

    const multipleHint = question.hasMultipleCorrect 
        ? '<div class="multiple-hint">⚠️ В этом вопросе может быть несколько правильных ответов</div>' 
        : '';

    let answersHtml = '';
    question.answers.forEach((answer, idx) => {
        const selected = userAnswers[currentQuestionIndex] === idx ? ' selected' : '';
        answersHtml += `<div class="answer-option${selected}" onclick="selectAnswer(${idx})">${answer.text}</div>`;
    });

    const title = currentTicket.id === 'random' ? 'Случайный тест' : 'Билет ' + currentTicket.id;

    app.innerHTML = `
        <div class="test-screen">
            <div class="test-header">
                <h2>${title}</h2>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="question-counter">Вопрос ${currentQuestionIndex + 1} из ${currentTicket.questions.length}</div>
            </div>

            <div class="question-container">
                ${multipleHint}
                <div class="question-text">${question.question}</div>
                <div class="answers-list">${answersHtml}</div>
            </div>

            <div class="test-controls">
                <button class="btn btn-secondary" onclick="prevQuestion()" ${currentQuestionIndex === 0 ? 'disabled' : ''}>← Назад</button>
                ${isLast
                    ? `<button class="btn btn-success" onclick="finishTest()">Завершить тест ✓</button>`
                    : `<button class="btn btn-primary" onclick="nextQuestion()">Далее →</button>`
                }
            </div>
        </div>
    `;
}

// === ВЫБОР ОТВЕТА ===
function selectAnswer(answerIndex) {
    userAnswers[currentQuestionIndex] = answerIndex;
    showQuestion();
}

// === НАВИГАЦИЯ ===
function nextQuestion() {
    if (currentQuestionIndex < currentTicket.questions.length - 1) {
        currentQuestionIndex++;
        showQuestion();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showQuestion();
    }
}

// === ЗАВЕРШЕНИЕ ТЕСТА ===
async function finishTest() {
    let correctCount = 0;
    let wrongCount = 0;

    currentTicket.questions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        if (userAnswer !== null && question.answers[userAnswer].correct) {
            correctCount++;
        } else {
            wrongCount++;
        }
    });

    const percentage = Math.round((correctCount / currentTicket.questions.length) * 100);
    const ticketIdToSave = currentTicket.id === 'random' ? 'random' : currentTicket.id;

    await saveUserStatistics(ticketIdToSave, correctCount, wrongCount, percentage);
    
    if (!statistics[ticketIdToSave]) {
        statistics[ticketIdToSave] = { attempts: 0, bestScore: 0, bestWrong: currentTicket.questions.length };
    }
    statistics[ticketIdToSave].attempts++;
    if (percentage > statistics[ticketIdToSave].bestScore) {
        statistics[ticketIdToSave].bestScore = percentage;
        statistics[ticketIdToSave].bestWrong = wrongCount;
    }

    let categoryHtml = '';
    if (wrongCount <= 5) {
        categoryHtml = '<div class="result-category senior"> Senior СМЭ — Отличный результат!</div>';
    } else if (wrongCount <= 10) {
        categoryHtml = '<div class="result-category middle">⭐ Middle СМЭ — Хороший результат!</div>';
    } else if (wrongCount <= 15) {
        categoryHtml = '<div class="result-category junior">📚 Junior СМЭ — Неплохо, но есть куда расти!</div>';
    } else {
        categoryHtml = '<div class="result-category fail">📖 Нужно больше практики. Попробуйте ещё раз!</div>';
    }

    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="result-screen">
            <h2>Результаты теста</h2>
            <div class="result-stats">
                <div class="result-row">
                    <span>Правильных ответов:</span>
                    <strong>${correctCount}</strong>
                </div>
                <div class="result-row">
                    <span>Ошибок:</span>
                    <strong>${wrongCount}</strong>
                </div>
                <div class="result-row">
                    <span>Процент правильных:</span>
                    <strong>${percentage}%</strong>
                </div>
            </div>
            ${categoryHtml}
            <div class="result-actions">
                <button class="btn btn-primary" onclick="showMainMenu()">В главное меню</button>
                <button class="btn btn-secondary" onclick="startTicket('${currentTicket.id}')">Пройти ещё раз</button>
            </div>
        </div>
    `;
}

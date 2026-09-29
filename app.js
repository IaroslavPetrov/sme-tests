// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let questions = [];
let tickets = [];
let currentTicket = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let statistics = {};

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', function() {
    // Используем данные из questions-data.js
    if (typeof QUESTIONS_DATA !== 'undefined') {
        questions = QUESTIONS_DATA;
    } else {
        questions = [];
    }
    createTickets();
    loadStatistics();
    showMainMenu();
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

// === ЗАГРУЗКА/СОХРАНЕНИЕ СТАТИСТИКИ ===
function loadStatistics() {
    const saved = localStorage.getItem('sme_statistics');
    if (saved) statistics = JSON.parse(saved);
}

function saveStatistics() {
    localStorage.setItem('sme_statistics', JSON.stringify(statistics));
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

    app.innerHTML = `
        <div class="main-menu">
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

            <h2>Выберите билет</h2>
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
                    <div class="cat-icon"></div>
                    <div class="cat-name">Junior СМЭ</div>
                    <div class="cat-desc">Не более 15 ошибок</div>
                </div>
            </div>
        </div>
    `;
}

// === НАЧАЛО ТЕСТА ===
function startTicket(ticketId) {
    currentTicket = tickets.find(t => t.id === ticketId);
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

    let answersHtml = '';
    question.answers.forEach((answer, idx) => {
        const selected = userAnswers[currentQuestionIndex] === idx ? ' selected' : '';
        answersHtml += `<div class="answer-option${selected}" onclick="selectAnswer(${idx})">${answer.text}</div>`;
    });

    app.innerHTML = `
        <div class="test-screen">
            <div class="test-header">
                <h2>Билет ${currentTicket.id}</h2>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="question-counter">Вопрос ${currentQuestionIndex + 1} из ${currentTicket.questions.length}</div>
            </div>

            <div class="question-container">
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
function finishTest() {
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

    // Сохраняем статистику
    if (!statistics[currentTicket.id]) {
        statistics[currentTicket.id] = { attempts: 0, bestScore: 0, bestWrong: currentTicket.questions.length };
    }
    statistics[currentTicket.id].attempts++;
    if (percentage > statistics[currentTicket.id].bestScore) {
        statistics[currentTicket.id].bestScore = percentage;
        statistics[currentTicket.id].bestWrong = wrongCount;
    }
    saveStatistics();

    // Определяем категорию
    let categoryHtml = '';
    if (wrongCount <= 5) {
        categoryHtml = '<div class="result-category senior">🏆 Senior СМЭ — Отличный результат!</div>';
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
                <button class="btn btn-secondary" onclick="startTicket(${currentTicket.id})">Пройти ещё раз</button>
            </div>
        </div>
    `;
}

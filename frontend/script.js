
let tasks = [];
async function sendCommand() {
    const input = document.getElementById('user-input');
    const command = input.value; input.value = '';
    appendMessage('Пользователь', command); updateTask('Выполнение команды', command);
    const response = await fetch('/api/command', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({command})});
    const data = await response.json(); appendMessage('ИИ', data.result); updateTask('Команда выполнена', data.result);
}
function appendMessage(sender, text) {
    const chat = document.getElementById('chat-window');
    chat.innerHTML += `<div><strong>${sender}:</strong> ${text}</div>`;
    chat.scrollTop = chat.scrollHeight;
}
function updateTask(status, details) {
    document.getElementById('task-status').innerText = status;
    tasks.push(`${status}: ${details}`); renderTasks();
}
function renderTasks() {
    const list = document.getElementById('task-list');
    list.innerHTML = tasks.map(task => `<li>${task}</li>`).join('');
}
function toggleTaskDetails() { document.getElementById('task-details').classList.toggle('hidden'); }

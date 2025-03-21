document.addEventListener('DOMContentLoaded', function() {
  const inputField = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const chatContent = document.getElementById('chat-content');

  let commandInProgress = false;

  sendBtn.addEventListener('click', function() {
    const message = inputField.value.trim();
    if (message) {
      appendMessage('user', message);
      inputField.value = '';
      processMessage(message);
    }
  });

  function appendMessage(sender, text) {
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');
    let renderedText = marked.parse(text); // Обработка Markdown
    // Замена символов перевода строки на <br>
    renderedText = renderedText.replace(/\n/g, '<br>');
    
    if (sender === 'bot') {
      messageBubble.innerHTML = `
        <div class="message-icon terminal-animation">
          <div class="code-preview highlight">${renderedText.slice(0, 20)}...</div>
        </div>
        <div class="message-text">${renderedText}</div>
      `;
    } else {
      messageBubble.innerHTML = `<div class="message-text">${renderedText}</div>`;
    }
    chatContent.appendChild(messageBubble);
    chatContent.scrollTop = chatContent.scrollHeight;
  }

  function processMessage(message) {
    // Определяем тип команды
    const terminalMatch = message.match(/^terminal\((.+)\)$/);
    const viewFileMatch = message.match(/^view_file\((.+)\)$/);
    const editFileMatch = message.match(/^edit_file\((.+)\)$/);

    if (terminalMatch && !commandInProgress) {
      commandInProgress = true;
      const command = terminalMatch[1];
      // Отправляем команду на выполнение на сервере
      fetch('/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'terminal', argument: command })
      })
      .then(response => response.json())
      .then(data => {
        appendMessage('bot', data.response);
        commandInProgress = false;
      })
      .catch(err => {
        appendMessage('bot', 'Ошибка при выполнении команды.');
        commandInProgress = false;
      });
    } else if (viewFileMatch && !commandInProgress) {
      commandInProgress = true;
      const filePath = viewFileMatch[1];
      fetch('/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'view_file', argument: filePath })
      })
      .then(response => response.json())
      .then(data => {
        appendMessage('bot', data.response);
        commandInProgress = false;
      })
      .catch(err => {
        appendMessage('bot', 'Ошибка при выполнении команды.');
        commandInProgress = false;
      });
    } else if (editFileMatch && !commandInProgress) {
      commandInProgress = true;
      const filePath = editFileMatch[1];
      // Ожидается, что новая информация уже включена в команду, здесь для примера используется фиксированный текст
      const newContent = "Новый контент файла, обновлён через команду.";
      fetch('/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'edit_file', argument: filePath, new_content: newContent })
      })
      .then(response => response.json())
      .then(data => {
        appendMessage('bot', data.response);
        commandInProgress = false;
      })
      .catch(err => {
        appendMessage('bot', 'Ошибка при выполнении команды.');
        commandInProgress = false;
      });
    } else {
      // Если сообщение не содержит специальной команды – обрабатываем через потоковую генерацию
      fetch('/process_stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message })
      })
      .then(response => response.text())
      .then(data => {
        appendMessage('bot', data);
      })
      .catch(err => {
        appendMessage('bot', 'Ошибка при обработке запроса.');
      });
    }
  }
});

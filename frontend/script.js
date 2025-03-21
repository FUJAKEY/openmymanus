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
    if (sender === 'bot') {
      messageBubble.innerHTML = `
        <div class="message-icon terminal-animation">
          <div class="code-preview highlight">${text.slice(0, 20)}...</div>
        </div>
        <div class="message-text">${text}</div>
      `;
    } else {
      messageBubble.innerHTML = `<div class="message-text">${text}</div>`;
    }
    chatContent.appendChild(messageBubble);
    chatContent.scrollTop = chatContent.scrollHeight;
  }

  function processMessage(message) {
    // Распознаем команды: terminal(...), view_file(...), edit_file(...)
    const terminalMatch = message.match(/^terminal\((.+)\)$/);
    const viewFileMatch = message.match(/^view_file\((.+)\)$/);
    const editFileMatch = message.match(/^edit_file\((.+)\)$/);

    if (terminalMatch && !commandInProgress) {
      commandInProgress = true;
      const command = terminalMatch[1];
      // Имитация выполнения команды в терминале
      setTimeout(() => {
        const output = `Выполнена команда: ${command}`;
        appendMessage('bot', `Команда была выполнена! Содержимое: ${output}`);
        commandInProgress = false;
      }, 1000);
    } else if (viewFileMatch && !commandInProgress) {
      commandInProgress = true;
      const filePath = viewFileMatch[1];
      // Имитация чтения файла
      setTimeout(() => {
        const fileContent = `Содержимое файла ${filePath}`;
        appendMessage('bot', `Команда была выполнена! Содержимое: ${fileContent}`);
        commandInProgress = false;
      }, 1000);
    } else if (editFileMatch && !commandInProgress) {
      commandInProgress = true;
      const filePath = editFileMatch[1];
      // Имитация редактирования файла
      setTimeout(() => {
        const newContent = `Новый контент файла ${filePath}`;
        appendMessage('bot', `Команда была выполнена! Содержимое: ${newContent}`);
        commandInProgress = false;
      }, 1000);
    } else {
      // Если сообщение не является специальной командой – отправляем его на сервер для ИИ-генерации
      fetch('/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message })
      })
      .then(response => response.json())
      .then(data => {
        appendMessage('bot', data.response);
      })
      .catch(err => {
        appendMessage('bot', 'Ошибка при обработке запроса.');
      });
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const inputField = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const chatContent = document.getElementById('chat-content');

  // Флаг, чтобы не выполнять сразу несколько команд
  let commandInProgress = false;

  sendBtn.addEventListener('click', () => {
    const message = inputField.value.trim();
    if (!message) return;
    appendMessage('user', message);
    inputField.value = '';
    processMessage(message);
  });

  function appendMessage(sender, rawText) {
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');

    // Обрабатываем Markdown:
    let rendered = marked.parse(rawText);
    // Вставляем контент
    if (sender === 'bot-command') {
      // Показ отдельного стиля для "Executing command"
      messageBubble.innerHTML = `
        <div class="message-icon terminal-animation">
          <div class="code-preview highlight">CMD</div>
        </div>
        <div class="message-text"><strong>Executing command:</strong> ${rendered}</div>
      `;
    } else if (sender === 'bot') {
      // Ответ от бота
      messageBubble.innerHTML = `
        <div class="message-icon terminal-animation">
          <div class="code-preview highlight">${rawText.slice(0, 20)}...</div>
        </div>
        <div class="message-text">${rendered}</div>
      `;
    } else {
      // Сообщение от пользователя
      messageBubble.innerHTML = `<div class="message-text">${rendered}</div>`;
    }

    chatContent.appendChild(messageBubble);
    chatContent.scrollTop = chatContent.scrollHeight;
  }

  function processMessage(message) {
    // Регулярки для команд
    const terminalMatch = message.match(/^terminal\((.+)\)$/);
    const viewFileMatch = message.match(/^view_file\((.+)\)$/);
    const editFileMatch = message.match(/^edit_file\((.+)\)$/);

    // Если находим соответствие и команда не в процессе
    if (terminalMatch && !commandInProgress) {
      commandInProgress = true;
      const cmd = terminalMatch[1];
      appendMessage('bot-command', cmd); // "Executing command"

      fetch('/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'terminal', argument: cmd })
      })
      .then(res => res.json())
      .then(data => {
        appendMessage('bot', data.response);
        commandInProgress = false;
      })
      .catch(err => {
        appendMessage('bot', `Ошибка при выполнении terminal: ${err}`);
        commandInProgress = false;
      });

    } else if (viewFileMatch && !commandInProgress) {
      commandInProgress = true;
      const filePath = viewFileMatch[1];
      appendMessage('bot-command', `view_file ${filePath}`);

      fetch('/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'view_file', argument: filePath })
      })
      .then(res => res.json())
      .then(data => {
        appendMessage('bot', data.response);
        commandInProgress = false;
      })
      .catch(err => {
        appendMessage('bot', `Ошибка при выполнении view_file: ${err}`);
        commandInProgress = false;
      });

    } else if (editFileMatch && !commandInProgress) {
      commandInProgress = true;
      // Например, edit_file(path|новое_содержимое)
      // Но здесь для упрощения ищем только путь
      // В реальном проекте можно парсить подробнее
      const filePath = editFileMatch[1];
      appendMessage('bot-command', `edit_file ${filePath}`);

      // Пример нового содержимого
      const newContent = "Новый контент файла, записанный через edit_file()";

      fetch('/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'edit_file',
          argument: filePath,
          new_content: newContent
        })
      })
      .then(res => res.json())
      .then(data => {
        appendMessage('bot', data.response);
        commandInProgress = false;
      })
      .catch(err => {
        appendMessage('bot', `Ошибка при выполнении edit_file: ${err}`);
        commandInProgress = false;
      });

    } else {
      // Если это НЕ специальная команда, запускаем потоковую генерацию
      streamChatResponse(message);
    }
  }

  /**
   * Запрос к /process_stream и пошаговое чтение ответа
   */
  function streamChatResponse(userMessage) {
    // Создаем fetch с body=message
    fetch('/process_stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage })
    })
    .then(response => {
      // Работаем напрямую с потоком тела ответа
      const reader = response.body.getReader();
      let partialText = '';

      function readChunk() {
        reader.read().then(({ done, value }) => {
          if (done) {
            // Когда поток закончился — финальное добавление
            if (partialText) {
              appendMessage('bot', partialText);
            }
            return;
          }
          // Декодируем chunk
          const chunkText = new TextDecoder('utf-8').decode(value);
          partialText += chunkText;
          // Можно в реальном времени обновлять одно сообщение:
          // Но для упрощения будем собирать весь ответ в partialText,
          // а потом добавим целиком.
          readChunk();
        });
      }
      readChunk();
    })
    .catch(err => {
      appendMessage('bot', `Ошибка при потоковой генерации: ${err}`);
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const inputField = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const chatContent = document.getElementById('chat-content');
  const showHistoryBtn = document.getElementById('show-history-btn');

  // При нажатии на кнопку "Show history" загружаем историю
  showHistoryBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/history');
      const historyData = await res.json();
      // Очищаем текущее окно чата и загружаем все сообщения
      chatContent.innerHTML = '';
      historyData.forEach(msg => {
        // msg.role = user / assistant / system
        appendMessage(msg.role === 'user' ? 'user' : 'bot', msg.content);
      });
    } catch (err) {
      console.error('Ошибка при загрузке истории:', err);
    }
  });

  sendBtn.addEventListener('click', () => {
    const message = inputField.value.trim();
    if (!message) return;
    appendMessage('user', message);
    inputField.value = '';
    processMessage(message);
  });

  /**
   * Создает bubble в чате.
   * @param {string} sender - 'user', 'bot', 'bot-command', 'system'
   * @param {string} rawText
   * @returns {HTMLElement} - сам bubble
   */
  function createMessageBubble(sender, rawText) {
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');

    let rendered = marked.parse(rawText); // Преобразуем Markdown

    if (sender === 'bot-command') {
      // Вывод "Executing command" с анимацией
      messageBubble.innerHTML = `
        <div class="message-icon terminal-animation">
          <div class="code-preview">CMD</div>
        </div>
        <div class="message-text"><strong>Executing command:</strong> ${rendered}</div>
      `;
    } else if (sender === 'bot') {
      // Ответ от бота (или потоковая часть)
      // Для потоковой генерации будем обновлять содержимое .message-text
      messageBubble.innerHTML = `
        <div class="message-icon terminal-animation">
          <div class="code-preview">${rawText.slice(0, 20)}...</div>
        </div>
        <div class="message-text">${rendered}</div>
      `;
    } else if (sender === 'user') {
      // Сообщение от пользователя
      messageBubble.innerHTML = `<div class="message-text">${rendered}</div>`;
    } else {
      // system / прочие
      messageBubble.innerHTML = `<div class="message-text">${rendered}</div>`;
    }
    return messageBubble;
  }

  /**
   * Добавляет bubble в чат
   */
  function appendMessage(sender, text) {
    const bubble = createMessageBubble(sender, text);
    chatContent.appendChild(bubble);
    chatContent.scrollTop = chatContent.scrollHeight;
    return bubble;
  }

  /**
   * Обработка сообщения: проверка на команды или вызов потоковой генерации
   */
  async function processMessage(message) {
    // Ищем команды
    const terminalMatch = message.match(/^terminal\((.+)\)$/);
    const viewFileMatch = message.match(/^view_file\((.+)\)$/);
    const editFileMatch = message.match(/^edit_file\((.+)\)$/);

    if (terminalMatch) {
      const cmd = terminalMatch[1];
      appendMessage('bot-command', cmd);

      // Выполняем команду на сервере
      try {
        const res = await fetch('/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'terminal', argument: cmd })
        });
        const data = await res.json();
        if (data.error) {
          appendMessage('bot', `**Ошибка:** ${data.error}`);
        } else {
          // Здесь мы сами отправляем "Команда была выполнена! ..." от лица пользователя
          const userMsg = `Команда была выполнена! Содержимое:\n\`\`\`\n${data.result}\n\`\`\`\nМожете выполнять новые команды, если нужно.`;
          appendMessage('user', userMsg);
          // Теперь пусть модель ответит потоково на это
          streamChatResponse(userMsg);
        }
      } catch (err) {
        appendMessage('bot', `Ошибка при выполнении terminal: ${err}`);
      }

    } else if (viewFileMatch) {
      const filePath = viewFileMatch[1];
      appendMessage('bot-command', `view_file ${filePath}`);

      try {
        const res = await fetch('/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'view_file', argument: filePath })
        });
        const data = await res.json();
        if (data.error) {
          appendMessage('bot', `**Ошибка:** ${data.error}`);
        } else {
          const userMsg = `Команда была выполнена! Содержимое файла \`${filePath}\`:\n\`\`\`\n${data.result}\n\`\`\`\nМожете выполнять новые команды, если нужно.`;
          appendMessage('user', userMsg);
          streamChatResponse(userMsg);
        }
      } catch (err) {
        appendMessage('bot', `Ошибка при выполнении view_file: ${err}`);
      }

    } else if (editFileMatch) {
      const filePath = editFileMatch[1];
      appendMessage('bot-command', `edit_file ${filePath}`);

      // Здесь можно расширить синтаксис, чтобы извлечь новый контент
      // Пока что берём жёстко зашитый пример
      const newContent = "Новый контент файла, записанный через edit_file().";

      try {
        const res = await fetch('/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'edit_file',
            argument: filePath,
            new_content: newContent
          })
        });
        const data = await res.json();
        if (data.error) {
          appendMessage('bot', `**Ошибка:** ${data.error}`);
        } else {
          const userMsg = `Команда была выполнена! Содержимое:\n\`\`\`\n${data.result}\n\`\`\`\nМожете выполнять новые команды, если нужно.`;
          appendMessage('user', userMsg);
          streamChatResponse(userMsg);
        }
      } catch (err) {
        appendMessage('bot', `Ошибка при выполнении edit_file: ${err}`);
      }

    } else {
      // Обычный текст => потоковая генерация
      streamChatResponse(message);
    }
  }

  /**
   * Потоковая генерация ответа: постепенно дополняем последний бот-bubble
   */
  function streamChatResponse(userMessage) {
    // Создаём новый bubble для бота, пока пустой
    const botBubble = appendMessage('bot', '');

    fetch('/process_stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage })
    })
    .then(response => {
      if (!response.body) {
        throw new Error('ReadableStream not yet supported in this browser.');
      }
      const reader = response.body.getReader();
      let accumulated = '';

      function readChunk() {
        reader.read().then(({ done, value }) => {
          if (done) {
            return;
          }
          const chunkText = new TextDecoder('utf-8').decode(value);
          accumulated += chunkText;
          // Обновляем содержимое bubble в реальном времени
          botBubble.querySelector('.message-text').innerHTML = marked.parse(accumulated);
          chatContent.scrollTop = chatContent.scrollHeight;
          readChunk();
        });
      }
      readChunk();
    })
    .catch(err => {
      botBubble.querySelector('.message-text').innerHTML = `Ошибка при потоковой генерации: ${err}`;
    });
  }
});

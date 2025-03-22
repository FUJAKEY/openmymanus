document.addEventListener('DOMContentLoaded', () => {
  // Включаем поддержку переносов строк в Marked.js
  marked.setOptions({ breaks: true });

  const inputField = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const chatContent = document.getElementById('chat-content');
  const showHistoryBtn = document.getElementById('show-history-btn');

  showHistoryBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/history');
      const historyData = await res.json();
      chatContent.innerHTML = '';
      historyData.forEach(msg => {
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

  function createMessageBubble(sender, rawText) {
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');
    let rendered = marked.parse(rawText);

    if (sender === 'bot-command') {
      messageBubble.innerHTML = `
        <div class="message-icon terminal-animation">
          <div class="code-preview">CMD</div>
        </div>
        <div class="message-text"><strong>Executing command:</strong> ${rendered}</div>
      `;
    } else if (sender === 'bot') {
      messageBubble.innerHTML = `
        <div class="message-icon terminal-animation">
          <div class="code-preview">${rawText.slice(0, 20)}...</div>
        </div>
        <div class="message-text">${rendered}</div>
      `;
    } else {
      messageBubble.innerHTML = `<div class="message-text">${rendered}</div>`;
    }
    return messageBubble;
  }

  function appendMessage(sender, text) {
    const bubble = createMessageBubble(sender, text);
    chatContent.appendChild(bubble);
    chatContent.scrollTop = chatContent.scrollHeight;
    return bubble;
  }

  async function processMessage(message) {
    // Проверяем, является ли сообщение специальной командой
    const terminalMatch = message.match(/^terminal(.+)$/);
    const viewFileMatch = message.match(/^view_file(.+)$/);
    const editFileMatch = message.match(/^edit_file(.+)$/);

    if (terminalMatch) {
      const cmd = terminalMatch[1];
      // Не создаём промежуточное сообщение для пользователя
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
          // Передаём результат выполнения команды в модель,
          // но промежуточное сообщение не показываем пользователю.
          streamChatResponse(`Команда была выполнена! Содержимое:\n\`\`\`\n${data.result}\n\`\`\``);
        }
      } catch (err) {
        appendMessage('bot', `Ошибка при выполнении terminal: ${err}`);
      }
    } else if (viewFileMatch) {
      const filePath = viewFileMatch[1];
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
          streamChatResponse(`Команда была выполнена! Содержимое файла \`${filePath}\`:\n\`\`\`\n${data.result}\n\`\`\``);
        }
      } catch (err) {
        appendMessage('bot', `Ошибка при выполнении view_file: ${err}`);
      }
    } else if (editFileMatch) {
      const filePath = editFileMatch[1];
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
          streamChatResponse(`Команда была выполнена! Содержимое:\n\`\`\`\n${data.result}\n\`\`\``);
        }
      } catch (err) {
        appendMessage('bot', `Ошибка при выполнении edit_file: ${err}`);
      }
    } else {
      // Если сообщение не является специальной командой – запускаем потоковую генерацию
      streamChatResponse(message);
    }
  }

  function streamChatResponse(messageText) {
    // Создаем пустой bot-bubble для генерации ответа модели
    const botBubble = appendMessage('bot', '');
    fetch('/process_stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: messageText })
    })
    .then(response => {
      if (!response.body) {
        throw new Error('ReadableStream не поддерживается в этом браузере.');
      }
      const reader = response.body.getReader();
      let accumulated = '';

      function readChunk() {
        reader.read().then(({ done, value }) => {
          if (done) return;
          const chunkText = new TextDecoder('utf-8').decode(value);
          accumulated += chunkText;
          // Обновляем содержимое botBubble с генерацией ответа от модели
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

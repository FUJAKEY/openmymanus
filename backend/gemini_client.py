import os
from google import genai
from google.genai import types

# Читаем API_KEY из переменных окружения или берём заглушку
API_KEY = os.environ.get('GEMINI_API_KEY', 'DEMO_KEY')
client = genai.Client(api_key=API_KEY)

# Глобальная переменная для хранения одного чата
chat = None

# Инструкции для модели (system_instruction)
BOT_INSTRUCTIONS = """
1. Если сообщение содержит команды:
   - terminal(команда)
   - view_file(путь)
   - edit_file(путь)
   выполняй соответствующие действия (один раз за генерацию).
   Затем отвечай: 
   "Команда была выполнена! Содержимое: [результат]. Можете выполнять новые команды, если нужно."

2. Если команды нет — просто отвечай пользователю. 

3. Используй Markdown для форматирования:
   - **жирный текст**
   - # заголовки
   - ```code``` для кода

4. Учитывай, что ответ может быть многострочным. Не забывай про корректную обработку \n.
"""

def get_chat():
    """
    Возвращает единственный чат-объект, создавая при необходимости.
    """
    global chat
    if chat is None:
        chat = client.chats.create(
            model="gemini-2.0-flash-thinking-exp"
        )
        # Можно добавить системную инструкцию как первый "system" месседж
        chat.send_message(role="system", content=BOT_INSTRUCTIONS)
    return chat

def send_message(message: str) -> str:
    """
    Отправка одного сообщения в чат (не потоковая).
    Возвращает полный ответ от модели (строкой).
    """
    c = get_chat()
    response = c.send_message(message)
    return response.text

def send_message_stream(message: str):
    """
    Потоковая генерация ответа chunk за chunk.
    Возвращает генератор, выдающий части текста.
    """
    c = get_chat()
    response_stream = c.send_message_stream(message)
    for chunk in response_stream:
        yield chunk.text

def get_chat_history():
    """
    Возвращает историю сообщений (role, content).
    """
    c = get_chat()
    history_list = []
    for msg in c.get_history():
        history_list.append({
            "role": msg.role,
            "content": msg.parts[0].text if msg.parts else ""
        })
    return history_list

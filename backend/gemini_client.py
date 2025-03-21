import os
from google import genai
from google.genai import types

API_KEY = os.environ.get('GEMINI_API_KEY', 'DEMO_KEY')
client = genai.Client(api_key=API_KEY)

# Глобальный объект чата
chat = None

# Системные инструкции, которые должны действовать для всей сессии
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
    Возвращает единый объект чата (singleton). Если не создан, создаём его.
    """
    global chat
    if chat is None:
        # Передаём system_instruction при создании
        chat = client.chats.create(
            model="gemini-2.0-flash-thinking-exp",
            system_instruction=BOT_INSTRUCTIONS
        )
    return chat

def send_message(message: str) -> str:
    """
    Отправка сообщения в чат (не потоковая).
    """
    c = get_chat()
    response = c.send_message(message)
    return response.text

def send_message_stream(message: str):
    """
    Потоковая отправка сообщения в чат (частями).
    """
    c = get_chat()
    response_stream = c.send_message_stream(message)
    for chunk in response_stream:
        yield chunk.text

def get_chat_history():
    """
    Возвращает историю сообщений в виде списка {role, content}.
    """
    c = get_chat()
    history_list = []
    for msg in c.get_history():
        history_list.append({
            "role": msg.role,
            "content": msg.parts[0].text if msg.parts else ""
        })
    return history_list

import os
from google import genai
from google.genai import types

API_KEY = os.environ.get('GEMINI_API_KEY', 'DEMO_KEY')
client = genai.Client(api_key=API_KEY)

chat = None

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
    global chat
    if chat is None:
        chat = client.chats.create(model="gemini-2.0-flash-thinking-exp")
        # Отправляем системное сообщение с инструкциями
        chat.send_message(BOT_INSTRUCTIONS)
    return chat

def send_message(message: str) -> str:
    c = get_chat()
    response = c.send_message(message)
    return response.text

def send_message_stream(message: str):
    c = get_chat()
    response_stream = c.send_message_stream(message)
    for chunk in response_stream:
        yield chunk.text

def get_chat_history():
    c = get_chat()
    history_list = []
    for msg in c.get_history():
        history_list.append({
            "role": msg.role,
            "content": msg.parts[0].text if msg.parts else ""
        })
    return history_list

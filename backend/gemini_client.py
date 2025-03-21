import os
from google import genai
from google.genai import types

# Используем переданный API ключ (заменяем на переменную окружения, если нужно)
API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyBfnmzemsffBdGoDVFOkSMfwdY9EFxi4EA')

client = genai.Client(api_key=API_KEY)

def generate_response(message):
    try:
        # Создаем чат с моделью gemini-2.0-flash-thinking-exp
        chat = client.chats.create(model="gemini-2.0-flash-thinking-exp")
        # Отправляем сообщение и получаем ответ
        response = chat.send_message(message)
        return response.text
    except Exception as e:
        return f"Ошибка генерации ответа: {str(e)}"

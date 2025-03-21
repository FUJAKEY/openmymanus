import os
from google import genai
from google.genai import types

API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyBfnmzemsffBdGoDVFOkSMfwdY9EFxi4EA')
client = genai.Client(api_key=API_KEY)

def generate_response(message):
    try:
        chat = client.chats.create(model="gemini-2.0-flash-thinking-exp")
        response = chat.send_message(message)
        return response.text
    except Exception as e:
        return f"Ошибка генерации ответа: {str(e)}"

def generate_response_stream(message):
    try:
        chat = client.chats.create(model="gemini-2.0-flash-thinking-exp")
        response = chat.send_message_stream(message)
        for chunk in response:
            yield chunk.text
    except Exception as e:
        yield f"Ошибка генерации ответа: {str(e)}"

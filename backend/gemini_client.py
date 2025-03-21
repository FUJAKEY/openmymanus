import os
from google import genai
from google.genai import types

# Подтягиваем ключ из переменных окружения или используем "заглушку"
API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyBfnmzemsffBdGoDVFOkSMfwdY9EFxi4EA')
client = genai.Client(api_key=API_KEY)

# Добавим инструкции прямо в system_instruction:
BOT_INSTRUCTIONS = """
1. Если сообщение содержит команды:
   - terminal(команда)
   - view_file(путь)
   - edit_file(путь)
   Выполняй соответствующие действия (один раз за генерацию).
   Затем отвечай: 
   'Команда была выполнена! Содержимое: [результат]. Можете выполнять новые команды, если нужно.'

2. При отсутствии команд — просто отвечай пользователю. 

3. Используй Markdown для форматирования:
   - **Жирный текст**
   - # Заголовки
   - ```code``` для кода

4. При ответе в несколько строк учитывай, что \n должны обрабатываться корректно.
"""

def generate_response(message: str) -> str:
    """
    Обычная (не потоковая) генерация ответа.
    """
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-thinking-exp",
            contents=message,
            config=types.GenerateContentConfig(
                max_output_tokens=512,
                temperature=0.2,
                system_instruction=BOT_INSTRUCTIONS
            )
        )
        return response.text
    except Exception as e:
        return f"Ошибка генерации ответа: {str(e)}"

def generate_response_stream(message: str):
    """
    Потоковая генерация ответа chunk за chunk.
    """
    try:
        response_stream = client.models.generate_content_stream(
            model="gemini-2.0-flash-thinking-exp",
            contents=[message],
            config=types.GenerateContentConfig(
                max_output_tokens=512,
                temperature=0.2,
                system_instruction=BOT_INSTRUCTIONS
            )
        )
        for chunk in response_stream:
            # chunk.text — это часть ответа
            yield chunk.text
    except Exception as e:
        yield f"Ошибка генерации ответа: {str(e)}"

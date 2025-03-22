import os
import re
import subprocess
from google import genai
from google.genai import types

# Чтение API ключа из файла config.txt
CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config.txt')
API_KEY = None
with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith("API_KEY="):
            API_KEY = line.strip().split("=", 1)[1]
            break
if not API_KEY:
    API_KEY = 'DEMO_KEY'

client = genai.Client(api_key=API_KEY)

chat = None

BOT_INSTRUCTIONS = """
1. Если сообщение содержит команды:
   - terminal(команда)
   - view_file(путь)
   - edit_file(путь|новое_содержимое)
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
        # Передаём инструкции через первое сообщение
        chat.send_message(BOT_INSTRUCTIONS)
    return chat

def send_message(message: str) -> str:
    c = get_chat()
    response = c.send_message(message)
    text = response.text
    return process_generated_response(text)

def send_message_stream(message: str):
    c = get_chat()
    response_stream = c.send_message_stream(message)
    accumulated = ""
    for chunk in response_stream:
        accumulated += chunk.text
    yield process_generated_response(accumulated)

def get_chat_history():
    c = get_chat()
    history_list = []
    for msg in c.get_history():
        history_list.append({
            "role": msg.role,
            "content": msg.parts[0].text if msg.parts else ""
        })
    return history_list

def execute_command(command_type: str, argument: str, new_content: str = None) -> str:
    """
    Выполняет команду в рабочей директории "project_workspace".
    Если такой папки нет – создаёт её.
    """
    workspace = os.path.join(os.getcwd(), "project_workspace")
    if not os.path.exists(workspace):
        os.makedirs(workspace)
    
    if command_type == "terminal":
        result = subprocess.run(
            argument,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=workspace
        )
        return result.stdout + result.stderr
    elif command_type == "view_file":
        filepath = os.path.join(workspace, argument)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            return f"Ошибка чтения файла: {str(e)}"
    elif command_type == "edit_file":
        filepath = os.path.join(workspace, argument)
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return f"Файл '{argument}' обновлён успешно."
        except Exception as e:
            return f"Ошибка записи файла: {str(e)}"
    else:
        return ""

def process_generated_response(text: str) -> str:
    """
    Ищет в сгенерированном ответе команды и, если находит,
    выполняет их, заменяя в тексте команды на результат выполнения.
    """
    # Обработка команды terminal(...)
    pattern_terminal = re.compile(r"terminal(.*?)")
    matches = pattern_terminal.findall(text)
    for cmd in matches:
        output = execute_command("terminal", cmd)
        replacement = f"terminal({cmd})\nРезультат выполнения:\n{output}"
        text = text.replace(f"terminal({cmd})", replacement)

    # Обработка команды view_file(...)
    pattern_view = re.compile(r"view_file(.*?)")
    matches_view = pattern_view.findall(text)
    for arg in matches_view:
        output = execute_command("view_file", arg)
        replacement = f"view_file({arg})\nСодержимое файла:\n{output}"
        text = text.replace(f"view_file({arg})", replacement)

    # Обработка команды edit_file(...). Ожидается формат: edit_file(путь|новое_содержимое)
    pattern_edit = re.compile(r"edit_file(.*?)")
    matches_edit = pattern_edit.findall(text)
    for full_arg in matches_edit:
        parts = full_arg.split("|")
        if len(parts) == 2:
            path = parts[0].strip()
            new_content = parts[1].strip()
            output = execute_command("edit_file", path, new_content)
            replacement = f"edit_file({full_arg})\nРезультат:\n{output}"
            text = text.replace(f"edit_file({full_arg})", replacement)
    return text

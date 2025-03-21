import os
import subprocess
from flask import Flask, request, jsonify, send_from_directory, Response, stream_with_context
from backend.gemini_client import generate_response, generate_response_stream

app = Flask(__name__, static_folder='../frontend', static_url_path='')

@app.route('/')
def index():
    # Отдаём главную страницу
    return send_from_directory('../frontend', 'index.html')

@app.route('/process', methods=['POST'])
def process():
    """
    Эндпоинт для НЕпотоковой генерации ответа.
    """
    data = request.get_json()
    message = data.get('message', '')
    response_text = generate_response(message)
    return jsonify({'response': response_text})

@app.route('/process_stream', methods=['POST'])
def process_stream():
    """
    Эндпоинт для потоковой генерации ответа.
    Возвращает текст chunk за chunk'ом.
    """
    data = request.get_json()
    message = data.get('message', '')

    @stream_with_context
    def generate():
        try:
            for chunk in generate_response_stream(message):
                # Каждую порцию сразу отдаем в поток
                yield chunk
        except Exception as e:
            yield f"\nОшибка генерации ответа: {str(e)}"

    # Устанавливаем заголовок text/event-stream или text/plain
    # text/plain подойдёт для простого примера без SSE
    return Response(generate(), mimetype='text/plain')

@app.route('/execute', methods=['POST'])
def execute():
    """
    Эндпоинт для выполнения специальных команд:
      - terminal(команда)
      - view_file(путь)
      - edit_file(путь)
    """
    data = request.get_json()
    command_type = data.get('type', '')
    argument = data.get('argument', '')

    if command_type == 'terminal':
        # Выполняем команду в терминале и возвращаем вывод
        try:
            result = subprocess.run(argument, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            output = result.stdout + result.stderr
            return jsonify({'response': f"Команда была выполнена!\n```bash\n{output}\n```"})
        except Exception as e:
            return jsonify({'response': f"Ошибка выполнения команды: {str(e)}"})

    elif command_type == 'view_file':
        # Читаем содержимое файла
        try:
            with open(argument, 'r', encoding='utf-8') as f:
                content = f.read()
            return jsonify({'response': f"Команда была выполнена!\n**Содержимое файла** `{argument}`:\n```\n{content}\n```"})
        except Exception as e:
            return jsonify({'response': f"Ошибка чтения файла: {str(e)}"})

    elif command_type == 'edit_file':
        # Записываем новый контент в файл
        new_content = data.get('new_content', '')
        try:
            with open(argument, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return jsonify({'response': f"Команда была выполнена!\nФайл `{argument}` обновлён содержимым:\n```\n{new_content}\n```"})
        except Exception as e:
            return jsonify({'response': f"Ошибка записи файла: {str(e)}"})

    else:
        return jsonify({'response': "Неверный тип команды."})

if __name__ == '__main__':
    # Перед запуском убедитесь, что выставлена переменная окружения GEMINI_API_KEY
    app.run(debug=True)

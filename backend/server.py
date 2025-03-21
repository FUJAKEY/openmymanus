import subprocess
from flask import Flask, request, jsonify, send_from_directory, Response, stream_with_context
from backend.gemini_client import (
    send_message,
    send_message_stream,
    get_chat_history
)

app = Flask(__name__, static_folder='../frontend', static_url_path='')

@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/history', methods=['GET'])
def history():
    """
    Возвращаем полную историю чата в JSON.
    """
    history_data = get_chat_history()
    return jsonify(history_data)

@app.route('/process', methods=['POST'])
def process():
    """
    Пример НЕпотоковой генерации (для отладки).
    """
    data = request.get_json()
    message = data.get('message', '')
    response_text = send_message(message)
    return jsonify({'response': response_text})

@app.route('/process_stream', methods=['POST'])
def process_stream():
    """
    Потоковая генерация ответа.
    """
    data = request.get_json()
    message = data.get('message', '')

    @stream_with_context
    def generate():
        try:
            for chunk in send_message_stream(message):
                yield chunk
        except Exception as e:
            yield f"\n[Ошибка генерации ответа: {str(e)}]"

    return Response(generate(), mimetype='text/plain')

@app.route('/execute', methods=['POST'])
def execute():
    """
    Выполнение реальных команд на сервере:
      - type='terminal', argument='команда'
      - type='view_file', argument='путь'
      - type='edit_file', argument='путь', new_content='...'
    Возвращаем только результат (без ответа от бота).
    Фронтенд потом отправит отдельное сообщение "Команда была выполнена!..."
    в модель, чтобы она продолжила диалог.
    """
    data = request.get_json()
    command_type = data.get('type', '')
    argument = data.get('argument', '')

    if command_type == 'terminal':
        try:
            result = subprocess.run(argument, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            output = result.stdout + result.stderr
            return jsonify({'result': output})
        except Exception as e:
            return jsonify({'error': str(e)}), 400

    elif command_type == 'view_file':
        try:
            with open(argument, 'r', encoding='utf-8') as f:
                content = f.read()
            return jsonify({'result': content})
        except Exception as e:
            return jsonify({'error': str(e)}), 400

    elif command_type == 'edit_file':
        new_content = data.get('new_content', '')
        try:
            with open(argument, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return jsonify({'result': f"Файл '{argument}' обновлён успешно."})
        except Exception as e:
            return jsonify({'error': str(e)}), 400

    else:
        return jsonify({'error': "Неверный тип команды."}), 400

if __name__ == '__main__':
    app.run(debug=True)

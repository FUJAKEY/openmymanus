from flask import Flask, request, jsonify, send_from_directory, Response
from backend.gemini_client import generate_response_stream, generate_response
import subprocess
import os

app = Flask(__name__, static_folder='../frontend', static_url_path='')

@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/process', methods=['POST'])
def process():
    data = request.get_json()
    message = data.get('message', '')
    # Если сообщение не является командой, обрабатываем через Gemini API
    response_text = generate_response(message)
    return jsonify({'response': response_text})

@app.route('/process_stream', methods=['POST'])
def process_stream():
    data = request.get_json()
    message = data.get('message', '')

    def generate():
        try:
            for chunk in generate_response_stream(message):
                yield chunk
        except Exception as e:
            yield f"Ошибка генерации ответа: {str(e)}"
    return Response(generate(), mimetype='text/plain')

@app.route('/execute', methods=['POST'])
def execute():
    data = request.get_json()
    command_type = data.get('type', '')
    argument = data.get('argument', '')
    if command_type == 'terminal':
        try:
            result = subprocess.run(argument, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            output = result.stdout + result.stderr
            return jsonify({'response': f"Команда была выполнена! Содержимое:\n{output}"})
        except Exception as e:
            return jsonify({'response': f"Ошибка выполнения команды: {str(e)}"})
    elif command_type == 'view_file':
        try:
            with open(argument, 'r', encoding='utf-8') as f:
                content = f.read()
            return jsonify({'response': f"Команда была выполнена! Содержимое файла {argument}:\n{content}"})
        except Exception as e:
            return jsonify({'response': f"Ошибка чтения файла: {str(e)}"})
    elif command_type == 'edit_file':
        new_content = data.get('new_content', '')
        try:
            with open(argument, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return jsonify({'response': f"Команда была выполнена! Файл {argument} обновлён."})
        except Exception as e:
            return jsonify({'response': f"Ошибка записи файла: {str(e)}"})
    else:
        return jsonify({'response': "Неверный тип команды."})

if __name__ == '__main__':
    # Убедитесь, что переменная окружения GEMINI_API_KEY установлена
    app.run(debug=True)

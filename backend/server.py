from flask import Flask, request, jsonify, send_from_directory
from backend.gemini_client import generate_response

app = Flask(__name__, static_folder='../frontend', static_url_path='')

@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/process', methods=['POST'])
def process():
    data = request.get_json()
    message = data.get('message', '')
    # Передаем сообщение в модель Gemini для генерации ответа
    response_text = generate_response(message)
    return jsonify({'response': response_text})

if __name__ == '__main__':
    app.run(debug=True)

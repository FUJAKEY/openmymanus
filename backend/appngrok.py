
from flask import Flask, request, jsonify, send_from_directory
from gemini_client import GeminiClient
import asyncio
from pyngrok import ngrok
import os

app = Flask(__name__, static_folder='../frontend')
gemini = GeminiClient()

@app.route('/api/command', methods=['POST'])
def execute_command():
    data = request.json
    command = data.get('command')

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(gemini.execute_command(command))
    
    return jsonify({"result": result})

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    port = 5000
    public_url = ngrok.connect(port).public_url
    print(f'Публичный URL: {public_url}')
    app.run(port=port, debug=True)

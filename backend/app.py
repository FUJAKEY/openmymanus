
from flask import Flask, request, jsonify
from gemini_client import GeminiClient
import asyncio

app = Flask(__name__)
gemini = GeminiClient()

@app.route('/api/command', methods=['POST'])
def execute_command():
    data = request.json
    command = data.get('command')

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(gemini.execute_command(command))
    
    return jsonify({"result": result})

if __name__ == '__main__':
    app.run(debug=True)

from flask import Flask, request, jsonify
from gemini_client import GeminiClient
import asyncio
from pyngrok import ngrok

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
    port = 5000

    # Здесь замени 'YOUR_NGROK_AUTH_TOKEN' на твой токен
    ngrok.set_auth_token("YOUR_NGROK_AUTH_TOKEN")
    
    public_url = ngrok.connect(port, "http")
    print(f" * ngrok URL: {public_url}")

    app.run(port=port, debug=True)


from google import genai

class GeminiClient:
    def __init__(self):
        self.client = genai.Client(api_key="AIzaSyBfnmzemsffBdGoDVFOkSMfwdY9EFxi4EA",
                                   http_options={'api_version': 'v1alpha'})
        self.chat = self.client.aio.chats.create(
            model='gemini-2.0-flash-thinking-exp'
        )

    async def execute_command(self, command: str):
        response = await self.chat.send_message(command)
        return response.text

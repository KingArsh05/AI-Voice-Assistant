import plivo

from ..config import Config


class PlivoClient:
    def __init__(self):
        self.client = plivo.RestClient(Config.PLIVO_AUTH_ID, Config.PLIVO_AUTH_TOKEN)


if __name__ == "__main__":
    client = PlivoClient()
    print("Plivo client initialized successfully")

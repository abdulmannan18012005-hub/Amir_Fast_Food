import os
import urllib.request
import urllib.error
from dotenv import load_dotenv

load_dotenv()

URL = os.environ.get('VITE_SUPABASE_URL')
KEY = os.environ.get('VITE_SUPABASE_ANON_KEY')

req = urllib.request.Request(f"{URL}/rest/v1/categories")
req.add_header('apikey', KEY)
req.add_header('Authorization', f'Bearer {KEY}')

try:
    with urllib.request.urlopen(req) as response:
        print(response.getcode())
        print(response.read().decode())
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode())

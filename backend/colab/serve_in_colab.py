# ONE Colab cell, for your friend. Run it AFTER the notebook cells that create flameguard_engine.py and app.py
# (cell 1..7 of New_Nasa_2026.ipynb) in the SAME Colab session. It starts that app.py and prints a public URL.
# Put that URL in the backend's .env as   FF_AI_URL=https://....trycloudflare.com   (no slash at the end)
# The URL changes every time this cell is run, and it stops when the Colab session ends.
!pip -q install fastapi uvicorn
!wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O cloudflared
!chmod +x cloudflared

import re, subprocess, sys, threading, time
import uvicorn

sys.path.insert(0, "/content")
server = uvicorn.Server(uvicorn.Config("app:app", host="127.0.0.1", port=8000, log_level="warning"))
threading.Thread(target=server.run, daemon=True).start()
time.sleep(3)

tunnel = subprocess.Popen(["./cloudflared", "tunnel", "--url", "http://127.0.0.1:8000"],
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
url = None
for line in tunnel.stdout:
    m = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
    if m:
        url = m.group(0)
        break
print("FF_AI_URL=" + str(url))

# first question loads the models (slow); do it now so the demo is fast
import requests
r = requests.post(url + "/query", json={"question": "PSI-25 oxygen and carbon monoxide changes"}, timeout=300)
print("test query:", r.status_code, list(r.json().keys()))

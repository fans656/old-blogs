import json

import requests


with open('all.json') as f:
    notes = json.load(f)['notes']

with open('/home/fans656/token') as f:
    token = f.read().strip()

for note in notes:
    res = requests.post('http://localhost:4435/note',
                  json=note,
                  cookies={'token': token})
    if res.status_code == 200:
        print note['ctime'], 'posted'
    else:
        print res.status_code, res.text
        break

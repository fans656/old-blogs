import os
import json


fnames = [f for f in os.listdir('pages') if f.endswith('.json')]
notes = []
for fname in fnames:
    with open('pages/' + fname) as f:
        page_notes = json.load(f)
        notes.extend(page_notes['notes'])
notes.sort(key=lambda n: n['ctime'])

with open('sina.json', 'w') as f:
    json.dump({'notes': notes}, f, indent=2)

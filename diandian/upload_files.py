import os
import requests
import json
from pprint import pprint
from datetime import datetime

from f6 import human_size

IMAGE_EXTS = set(['.jpeg', '.png', '.gif', 'jpg'])
REMOTE_URL_PREFIX = 'http://ub:6561/api/file/images/diandian/'

n_images = 0
total_size = 0

for dirname in os.listdir('.'):
    if not os.path.isdir(dirname):
        continue
    for fname in os.listdir(dirname):
        if not any(fname.lower().endswith(ext) for ext in IMAGE_EXTS):
            continue
        fpath = os.path.join(dirname, fname)
        remote_path = fpath.replace('\\', '/')
        url = REMOTE_URL_PREFIX + remote_path

        with open(fpath, 'rb') as f:
            data = f.read()

        r = requests.post(url, data=data)
        assert r.status_code == 200
        print url

        n_images += 1
        total_size += os.stat(fpath).st_size

print n_images
print human_size(total_size)

exit()
r = requests.post(
    'http://ub:6561/api/file/foo.html',
    data='<h1>hello fans656.me</h1>',
    headers={
    }
)
res = r.json()
if res['errno']:
    print res['detail']
pprint(res)

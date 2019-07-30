import os
import json
import hashlib

from flask import *


app = Flask(__name__)


img_fnames = os.listdir('images')


@app.after_request
def after_request(r):
    r.headers['Cache-Control'] = 'no-cache'
    return r


@app.route('/', methods=['POST'])
def index():
    data = request.json
    with open('pages/{}.json'.format(data['page']), 'w') as f:
        json.dump(data, f, indent=2)
    return ''


@app.route('/all', methods=['POST'])
def post_all():
    data = request.json
    with open('all.json', 'w') as f:
        json.dump(data, f, indent=2)
    return ''


@app.route('/<string:md5>', methods=['POST'])
def post_image(md5):
    mime = request.headers.get('Content-Type')
    data = request.get_data()
    fpath = 'images/{}.{}'.format(md5, mime.split('/')[1])

    m = hashlib.md5()
    m.update(data)
    expected_md5 = m.hexdigest()

    with open(fpath, 'wb') as f:
        f.write(data)
    return ''


@app.route('/page', methods=['POST'])
def get_page():
    return send_from_directory('.', 'processed.json')


@app.route('/<string:prefix>')
@app.route('/file/<string:prefix>')
def get_img(prefix):
    for img_fname in img_fnames:
        if img_fname.startswith(prefix):
            return send_from_directory('images', img_fname)
    return 'not found', 404


@app.route('/file')
def get_imgs():
    ret = ''
    for img_fname in img_fnames:
        ret += (
            '<div style="margin: 1em; border: 1px solid black">'
            + '<img src="/file/{}"/>'.format(img_fname)
            + '</div>'
        )
    return ret


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=4436, threaded=True, debug=True)

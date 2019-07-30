import time

from flask import Flask, send_file, render_template

app = Flask(__name__, static_folder='.', template_folder='.')

@app.route('/')
def index():
    return render_template('all.html', i_pages=range(1, 19 + 1))

@app.route('/<int:pn>')
def page(pn):
    with open('{}.html'.format(pn)) as f:
        html = f.read()
    html += '<script src="showdown.min.js"></script>'
    html += '<script src="convert.js?{}"></script>'.format(time.time())
    return html

@app.route('/<path:path>')
def send_static(path):
    return send_file(path);

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, threaded=True, debug=True)

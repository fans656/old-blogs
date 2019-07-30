import os
import re
import json
import datetime
import hashlib

import requests
from pyquery import PyQuery as pq
from lxml import etree

from notes import notes


'''
manual process
E___0088ZHYXSIG => 71e819f8ddf2325e8517d235c906ee93
E___0161EN00SIG => 1dc024a08c61dc4c1d920c51ad2839f6
E___0160EN00SIG => 9ee25ab5ea855aadb2c22a6b90da4c83
7bd88df2b5be33e1a79ac91e7d0376b5 => 9ccad3ee694e344fb5c30b047e47be1d
'''


def process_comment_content(content):
    content = content.replace('\r\\n', '\n')
    content = content.replace('\\n', '\n')
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if re.match('.*emoticons.*', line):
            print line
    return '\n'.join(lines)


def normalize_notes(users):
    for note in notes:
        ctime = datetime.datetime.strptime(note['ctime'], '%Y-%m-%d %H:%M')
        ctime -= datetime.timedelta(hours=8)
        ctime = ctime.strftime('%Y-%m-%d %H:%M:%S UTC')
        note['type'] = 'html'
        note['ctime'] = ctime
        for key in note.keys():
            if not note[key]:
                del note[key]
        for comment in note.get('comments', []):
            user = users[comment['username'] or comment['ip']]
            del comment['username']
            comment['nickname'] = user['nickname']
            del comment['avatar_url']
            comment['avatar_md5'] = user['avatar_md5']
            comment['type'] = 'sina'
            comment['content'] = process_comment_content(comment['content'])

            ctime = comment['ctime']
            ctime = datetime.datetime.strptime(ctime, '%Y-%m-%d %H:%M:%S')
            ctime -= datetime.timedelta(hours=8)
            ctime = ctime.strftime('%Y-%m-%d %H:%M:%S UTC')
            comment['ctime'] = ctime


def process_users_from_comments():
    if os.path.exists('users.json'):
        with open('users.json') as f:
            return json.load(f)

    comments = []
    for note in notes:
        comments.extend(note.get('comments', []))
    users = {}
    for comment in comments:
        nickname = comment['username']
        if not nickname:
            nickname = comment['ip']
        avatar_url = comment['avatar_url']
        if nickname not in users:
            res = requests.get(avatar_url)
            if res.status_code == 200:
                ext = res.headers.get('Content-Type').split('/')[-1]
                img_data = res.content
                m = hashlib.md5()
                m.update(img_data)
                md5 = m.hexdigest()
                fname = '{}.{}'.format(md5, ext)
                with open('images/' + fname, 'wb') as f:
                    f.write(img_data)
            else:
                raise Exception('failed to fetch {}\'s avatar'.format(nickname))
            users[nickname] = {
                'nickname': nickname,
                'avatar_md5': md5,
            }
    with open('users.json', 'w') as f:
        json.dump(users, f, indent=2)
    return users


with open('sina.json') as f:
    notes = json.load(f)['notes']


users = process_users_from_comments()
normalize_notes(users)


with open('processed.json', 'w') as f:
    json.dump(notes, f, indent=2)

import re

from notes import notes


img_urls = []
for note in notes:
    content = note['content']
    if 'sinaimg.cn' in content:
        matches = re.findall('url=http://[^"]*\.sinaimg\.cn[^"]*"', content)
        print note
        break
        for match in matches:
            url = match[4:-1]
            img_urls.append(url)

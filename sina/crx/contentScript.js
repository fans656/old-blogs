async function processDirectImages(e) {
  const imgs = $(e).find('img');
  for (const img of imgs) {
    const res = await fetch(img.src);
    const blob = await res.blob();
    const md5_value = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const data = reader.result;
        const md5_value = md5(new Uint8Array(data));
        resolve(md5_value);
      };
      reader.readAsArrayBuffer(blob);
    });
    const headers = new Headers();
    headers.append('Content-Type', blob.type);
    await fetch('http://ub:5000/' + md5_value, {
      method: 'POST',
      body: blob,
      headers: headers,
    });
    $(img).attr('md5', md5_value);
  }
}

async function processHiddenImages(e) {
  const links = $(e).find('a').toArray();
  for (const link of links) {
    const href = link.href;
    if (href.match('sinaimg')) {
      const imgUrl = href.match('url=(.*)')[1];
      if ($(link).find('img').toArray().length === 0) {
        $(link).append($('<img src="' + imgUrl + '"/>'));
        console.log('IMG', imgUrl);
      }
    } else {
      console.log('HREF', href);
    }
  }
}

async function processImages(e) {
  await processHiddenImages(e);
  await processDirectImages(e);
}

async function parse() {
  const title_a = $('.blog_title_h .blog_title').map((_, e) => {
    const title = $(e).text().trim();
    if (title.match(/\d\d\d\d年\d{1,2}月\d{1,2}日/)) {
      return '';
    }
    return title;
  }).toArray();
  
  const ctime_a = $('.blog_title_h .time').map((_, e) => {
    const s = $(e).text();
    return s.substring(1, s.length - 1);
  }).toArray();
  
  const tags_a = $('.blog_tag').map((_, e) => {
    const tags = $(e).find('h3').map((_, e) => {
      return $(e).text();
    }).filter((_, tag) => {
      return tag !== '杂谈';
    }).toArray();
    return {tags: tags};
  });
  
  const content_a = await Promise.all($('.bloglist .content').map(async (_, e) => {
    await processImages(e);
    const content = $(e).html();
    return content;
  }).toArray());
  
  const comments_a = [];
  for (const e of $('.bloglist .tagMore').toArray()) {
    const href = $(e).find('a:nth-child(2)').attr('href');
    const articleID = href.match(/.*blog_(.*)\..*/)[1];
    const url = (
      'http://comment5.news.sina.com.cn/page/info?channel=blog&newsid='
      + articleID
      + '&callback=script_callbackes.getCmntList&_=1535810910247&page=1&page_size=50'
      + '&oe=utf-8&score=&fake=1&thread=1&list=asc&t_size=1000&varname=requestId_22340090'
    );
    const res = await fetch(url);
    const comments = [];
    if (res.status === 200) {
      const text = await res.text();
      const result = JSON.parse(
        text.match(/script_callbackes.getCmntList\((.*)\)/)[1]
      ).result;
      for (const cmt of result.cmntlist) {
        if (cmt.comment_imgs.length) {
          console.log('WARNING comment has images');
        }
        const comment = {
          username: cmt.nick,
          avatar_url: cmt.profile_img,
          ctime: cmt.time,
          content: cmt.content,
          ip: cmt.ip,
        };
        comments.push(comment);
      };
    } else {
      console.log('error fetching comments');
    }
    comments_a.push(comments);
  };
  
  const n = title_a.length;
  if (ctime_a.length !== n
    || tags_a.length !== n) {
    console.log('oops, notes number seems wrong');
    console.log('titles', title_a.length);
    console.log('ctime_a', ctime_a.length);
    console.log('tags_a', tags_a.length);
  }
  
  const notes = [];
  for (let i = 0; i < title_a.length; ++i) {
    notes.push({
      title: title_a[i],
      ctime: ctime_a[i],
      tags: tags_a[i].tags,
      content: content_a[i],
      comments: comments_a[i],
    });
  }
  
  const page = $('.SG_pgon').text();
  const postData = {notes: notes, page: page};
  console.log(postData);
  
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  await fetch('http://ub:5000', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(postData),
  });
  
  $('.SG_pgon')[0].scrollIntoView(false);
}

parse();

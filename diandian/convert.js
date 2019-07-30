const KTH_POST_TO_SCROLL_TO = 0;
const DEBUG = true;
const TODO_PREIX = '___________DEBUG_TODO ';
let g_debug_post;

$(function() {
  $('#content').css({'margin': '0'});
  const jqposts = $('#content [class*="-post"]');

  const posts = jqposts.toArray().map(
    (postNode, i) => convertPostToJSON($(postNode), i)
  );

  posts.forEach((post, i) => attachToElement($(jqposts[i]), post, i));
  $('h4').css({margin: '0'});
  scrollToPost($(jqposts[KTH_POST_TO_SCROLL_TO]));
  
  posts.forEach((post, i) => post.submit(i));
  //console.log(posts[45].markdown.length);  // 7.html
  //posts[45].submit();
});

function convertPostToJSON(post, idx) {
  let errmsg = null;
  try {
    let jsonPost = null;
    g_debug_post = post;
    if (post.hasClass('text-post')) {
      jsonPost = new TextPost(post);
    } else if (post.hasClass('photo-post')) {
      jsonPost = new PhotoPost(post);
    } else if (post.hasClass('audio-post')) {
      jsonPost = new AudioPost(post);
    } else if (post.hasClass('video-post')) {
      jsonPost = new VideoPost(post);
    } else if (post.hasClass('link-post')) {
      jsonPost = new LinkPost(post);
    }
    if (jsonPost !== null) {
      jsonPost.clearIntermediateAttrs();
      if (jsonPost.invalid === undefined) {
        jsonPost.invalid = g_debug_post.invalid;
      }
      return jsonPost;
    } else {
      errmsg = `unknown type ${post.attr('class')} of the `
        + `${idx}th post `
        + `\n(only support text/audio/video)`;
      throw new Error(errmsg);
    }
  } catch (e) {
    console.log(e);
    errmsg = `convert ${idx}th post to JSON failed`;
  }
  alert(errmsg);
  markPostAsError(post)
  scrollToPost(post);
  throw new Error(errmsg);
}

function attachToElement(elem, post, idx) {
  elem.addClass(`p${idx}`);
  const elemOffset = elem.offset();
  const elemX = elemOffset.left;
  const elemY = elemOffset.top;
  const div = divFromPost(post, idx).css({
    position: 'absolute',
    left: elemX + elem.width(),
    top: elemY + 'px',
  });
  elem.append(div);
  elem.css({
    height: Math.max(elem.height(), div.height()),
  });
}

function scrollToPost(post) {
  const wndHeight = $(window).height();
  const postHeight = post.height();
  if (postHeight > wndHeight) {
    window.scroll(0, post.offset().top - 100);
  } else {
    window.scroll(0, post.offset().top - postHeight / 2);
  }
}

function divFromPost(post, idx) {
  const div = $('<div>');

  const showdownConverter = new showdown.Converter();
  const html = showdownConverter.makeHtml(post.markdown || '&nbsp;');
  const md = $('<div>').append(html).css({
    border: '1px solid black',
    width: '540px',
  });
  md.find('p').css({margin: '0'})
  md.find('a').css({'word-wrap': 'break-word'})
  div.append($('<div class="markdown">').append(md));

  const repr = JSON.stringify(post, null, '  ');
  const pre = $(`<pre>${repr}</pre>`).css({
    font: '.8em Consolas',
    margin: '0',
    padding: '0 1em',
    'white-space': 'pre-wrap',
  });
  div.append($('<div class="json">')
    .append(`<h4>JSON #${idx}</h4>`)
    .append(pre));

  if (post.invalid) {
    pre.css({
      border: '1px solid red',
    });
  }
  return div;
}

function markPostAsError(post) {
  post.css({
    border: '1px solid red',
  });
}

class Post {
  constructor(post) {
    const title = post.find('.title');
    if (title.length) {
      this.title = title.text().trim();
    }
    
    const meta = post.find('.meta');

    this.date = extractDate(meta.find('.date'));
    this['date-str'] = this.date.toLocaleDateString();
    
    this.tags = meta.find('.tag a').toArray().map(a => $(a).text());
    
    this.richContent = post.find('.rich-content');
    
    this.markdown = '<p style="background: red">'
      + 'markdown convert shuold be implemented in subclass'
      + '</p>';
  }
  
  clearIntermediateAttrs() {
    delete this.richContent;
    if (!DEBUG) {
      for (const attr in this) {
        if (attr.match(/^DEBUG.*/)) {
          delete this[attr];
        }
      }
    }
  }
  
  submit(idx) {
    console.log('submit turned off (see submit() definition)'); return;
    console.log('submiting', this);
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    const links = [
      {'rel': 'type', 'dst': 'blog'},
      {'rel': 'source', 'dst': {'data': 'diandian'}},
    ];
    if (this.title) {
      links.push({'rel': 'title', 'dst': {'data': this.title}});
    }
    for (const tag of this.tags) {
      links.push({
        'rel': 'tag',
        'dst': {'data': tag},
      });
    }
    const data = {
      'data': this.markdown,
      'links': links,
      'ctime': this.date.toUTCString(),
    }
    fetch('http://ub:6561/api/node', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
    }).then(resp => resp.json().then(data => {
      console.log(data);
      const postNode = $('.p' + idx);
      if (data.errno) {
        postNode.css({
          border: '1px solid ' + 'red',
        });
      } else {
        postNode.remove();
      }
    }));
  }
}

class TextPost extends Post {
  constructor(post) {
    super(post);
    this['post-type'] = 'text';
    
    const type = detectRichContentType(this.richContent);
    this.DEBUG___type = type;
    if (type === 'multiline'){
      this.paragraphs = [fromMultiline(this.richContent, 'TextPost.multiline')];
    } else if (type === 'mixed'){
      this.paragraphs = fromMixed(this.richContent, 'TextPost.mixed');
    } else if (type === 'paras'){
      this.paragraphs = fromParas(this.richContent, 'TextPost.paras');
    } else {
      this.invalid = 'unknown text post pargraphs type';
    }
    
    this.markdown = markdownParas(this.paragraphs);
  }
}

class PhotoPost extends Post {
  constructor(post) {
    super(post);
    this['post-type'] = 'photo';
    this.images = post.find('img').map((_, imgNode) => {
      const img = $(imgNode);
      return {
        type: 'img',
        src: img.attr('src'),
        width: img.attr('width'),
        height: img.attr('height'),
      }
    }).toArray();
    this.paragraphs = fromParas(this.richContent, 'PhotoPost');
    this.makeMarkdown();
  }
  
  makeMarkdown() {
    let md = '';
    for (const img of this.images) {
      md += markdownImage(img) + '\n';
    }
    md += '\n';
    for (const para of this.paragraphs) {
      md += markdownPara(para) + '\n\n';
    }
    this.markdown = md;
  }
}

class AudioPost extends Post {
  constructor(post) {
    super(post);
    this['post-type'] = 'audio';
    const url = post.find('[name=movie]').attr('value');
    try {
      const uid = url.match(/.*\/0_(\d+)\/.*/)[1];
      this.widget = post.find('object').html()
      this.href = 'http://www.xiami.com/song/' + uid;
    } catch (e) {
      ;
    }
    [this.name, this.album] = post.find('.content:has(strong)').text()
      .split('--').map(s => s.trim());
    this.paragraphs = fromParas(this.richContent);

    this.makeMarkdown();
  }
  
  makeMarkdown() {
    let widget = this.widget;
    if (widget === undefined) {
      const style = (
        "font-family: 'Microsoft Yahei', '微软雅黑', "
          + 'Tahoma, Arial, Helvetica, STHeiti;'
        + 'font-weight: 400;'
        + 'margin: 1.5em 2em;'
        + 'font-size: .85em;'
      );
      widget = '<div style="' + style + '">呃，播放出错了:(</div>'
    }
    let md = '';
    md += '<div class="music">' + widget + '</div>\n\n';
    if (!this.href) {
      md += '<span>'
        + `<span class="name">${this.name}</span>`
        + ' -- '
        + `<span class="album">${this.album}</span>`
        + '</span>'
        + '\n\n';
    } else {
      md += `<a href="${this.href}">`
        + `<span class="name">${this.name}</span>`
        + ' -- '
        + `<span class="album">${this.album}</span>`
        + '</a>'
        + '\n\n';
    }
    md += markdownParas(this.paragraphs);
    this.markdown = md;
  }
}

class VideoPost extends Post {
  constructor(post) {
    super(post);
    this['post-type'] = 'video';
    this.video = post.find('object').html();
    this.paragraphs = fromParas(this.richContent, 'VideoPost');
    this.makeMarkdown();
  }
  
  makeMarkdown() {
    let md = '';
    md += '<div class="video">' + this.video + '</div>\n\n';
    for (const para of this.paragraphs) {
      md += markdownPara(para) + '\n\n';
    }
    this.markdown = md;
  }
}

class LinkPost extends Post {
  constructor(post) {
    super(post);
    this['post-type'] = 'link';
    const a = post.find('a.title');
    this.text = fromTextNode(a).value;
    this.href = a.attr('href');
    this.markdown = `[${this.text}](${this.href})`;
  }
}

function extractDate(date) {
  const href = date.attr('href');
  const dateStr = href.match(/.*(\d\d\d\d-\d\d-\d\d).*/)[1];
  return new Date(dateStr + ' 00:00:00+08:00');
}

function detectRichContentType(richContent) {
  if (isMultiline(richContent)){
    return 'multiline';
  } else if (isMixed(richContent)) {
    return 'mixed';
  } else {
    return 'paras';
  }
}

function isMultiline(elem) {
  const hasTextNodes = elem.contents().toArray().filter(c =>
    c.nodeType === Node.TEXT_NODE && c.nodeValue.trim()
  ).length > 0;
  const hasBR = elem.children().toArray().some(c => c.tagName === 'BR');
  return hasTextNodes && hasBR;
}

function fromMultiline(elem, caller) {
  caller += ' fromMultiline';
  const res = [];
  elem.contents().toArray()
    .filter(c => c.nodeType !== Node.TEXT_NODE || fromTextNode($(c)).value)
    .forEach(c => {
      let para;
      if (c.nodeType === Node.TEXT_NODE) {
        para = fromTextNode($(c), caller);
      } else {
        para = fromElement($(c), caller);
      }
      if (para instanceof Array) {
        for (const p of para) {
          res.push(p);
        }
      } else {
        res.push(para);
      }
    });
  return res;

  //let lines = content[0].innerText.split('\n');
  //if (lines.length === 2 && lines.every(line => line === '')) {
  //  lines = [''];
  //  /*
  //    <!-- page1 #2 -->
  //    <div class="rich-content">
  //      <p><span>结束啦结束啦</span></p>
  //      <p><span><br></span></p>
  //      <p><span>"之前的qq版本过低..."</span></p>
  //    </div>
  //   */
  //}
  //if (lines.length === 2 && lines[1] === '') {
  //  lines = [lines[0]];
  //}
  //return lines.map(text => {
  //  if (text) {
  //    return {
  //      'type': 'text',
  //      'value': text,
  //    }
  //  } else {
  //    return {'type': 'br'};
  //  }
  //});
}

function fromMixed(content, caller) {
  caller += ' fromMixed'
  return content.contents().toArray()
    .filter(c => c.nodeType !== Node.TEXT_NODE || fromTextNode($(c)).value)
    .map(c => {
      if (c.nodeType === Node.TEXT_NODE) {
        return [fromTextNode($(c), caller)];
      } else {
        return fromPara($(c), caller);
      }
    });
}

function fromParas(content, caller) {
  caller += ' fromParas';
  return content.children().toArray().map(c => fromPara($(c), caller));

  //const children = content.children().toArray()
  //if (isAllSpan(content)) {
  //  /*
  //    <div class="rich-content">
  //      <span>hello</span>
  //      <span><br></span>
  //      <span>world</span>
  //    </div>
  //   */
  //  return children.map(fromSpan);
  //} else {
  //  const paras = children.map(childNode => {
  //    const tagName = childNode.tagName;
  //    const child = $(childNode);
  //    if (isP(child)) {
  //      return fromPara(child);
  //    } else if (isLinkedImage(child)) {
  //      return fromLinkedImage(child);
  //    } else if (childNode.tagName === 'BR') {
  //      return {'type': 'br'};
  //      return fromLinkedImage(child);
  //    } else if (tagName === 'BLOCKQUOTE') {
  //      return [{
  //        'type': 'blockquote',
  //        'paragraphs': fromParas(child),
  //      }]
  //    } else if (tagName === 'A') {
  //      return fromLink(child);
  //    } else {
  //      g_debug_post.invalid = true;
  //      return TODO_PREIX + childNode.innerHTML;
  //    }
  //  });
  //  const res = [];
  //  for (const para of paras) {
  //    if (para.length === 1 && para[0].type === 'multiline') {
  //      Array.prototype.push.apply(res, para[0].lines.map(line => [line]));
  //    } else {
  //      res.push(para);
  //    }
  //  }
  //  return res;
  //}
}

function isP(elem) {
  return elem[0].tagName === 'P';
}

function fromPara(elem, caller) {
  caller += ' fromPara';
  if (isLinkedImagePara(elem)) {
    return [fromLinkedImage(elem, caller)];
  } else if (isLinkPara(elem)) {
    return fromLinkPara(elem, caller);
  } else if (isNewlinePara(elem)) {
    return [{'type': 'br', 'DEBUG___caller': caller}];
  } else if (isImagePara(elem)) {
    return fromImagePara(elem, caller);
  } else if (isBlockquote(elem)) {
    return [fromBlockquote(elem, caller)];
  } else if (isMultiline(elem)) {
    return fromMultiline(elem, caller);
  } else if (isSimplePara(elem)) {
    return fromSimplePara(elem, caller);
  } else if (isSpanPara(elem)) {
    return fromSpanPara(elem, caller);
  } else if (isMultiPart(elem)) {
    return fromMultiPart(elem, caller);
  } else if (elem[0].tagName === 'A') {
    return [fromLink(elem)];
  }
  g_debug_post.invalid = true;
  return [{
    'type': elem[0].tagName,
    'detail': elem.html(),
    'DEBUG___caller': caller
  }];

  //return TODO_PREIX + elem.html();

  //const children = p.children();
  //const nonBrChildren = children.toArray().filter(c => c.tagName !== 'BR');
  //if (children.length) {
  //  if (isMultiline(p)) {
  //    const lines = fromMultiline(p);
  //    if (lines.length === 1) {
  //      return lines;
  //    } else {
  //      return [{
  //        'type': 'multiline',
  //        'lines': fromMultiline(p)
  //      }];
  //    }
  //  } else if (isLinkedImage(p)) {
  //    return fromLinkedImage(p);
  //  // a
  //  } else if (nonBrChildren.length && nonBrChildren.every(c => c.tagName === 'A')) {
  //    const a = children.filter((_, c) => $(c).text());
  //    return [{
  //      'type': 'a',
  //      'href': a.attr('href'),
  //      'text': a.text(),
  //    }]
  //  // strong
  //  } else if (nonBrChildren.length === 1
  //    && nonBrChildren[0].tagName === 'STRONG'
  //  ) {
  //    return [{'type': 'strong', 'value': children.text()}];
  //  // dummy a
  //  } else if (p.find('a').length
  //    && p.find('a').toArray().every(a => $(a).text() === '')
  //  ) {
  //    return [{'type': 'dummy-a'}];
  //  // img
  //  } else if (children.length == 1 && p.find('img').length) {
  //    const img = p.find('img');
  //    return [{
  //      'type': 'img',
  //      'src': img.attr('src'),
  //    }];
  //  // span
  //  } else if (children.length == 1 && children[0].tagName === 'SPAN') {
  //    const span = $(children[0]);
  //    if (isMultiline(span)) {
  //      const lines = fromMultiline(span);
  //      if (lines.length === 1) {
  //        return lines;
  //      } else {
  //        return [{
  //          'type': 'multiline',
  //          'lines': fromMultiline(span)
  //        }];
  //      }
  //    }
  //  } else if (isMultiline(p)) {
  //    return [{'type': 'multiline', 'lines': fromMultiline(p)}];
  //  // br
  //  } else if (p[0].tagName === 'BR') {
  //    return {'type': 'br'};
  //  // single para with trailing br
  //  } else if (children.length === 1
  //    && children[0].tagName === 'BR'
  //    && p.text().trim()
  //  ) {
  //    return [{
  //      'type': 'text',
  //      'value': p.text(),
  //    }]
  //  // blockquote
  //  } else if (p[0].tagName === 'BLOCKQUOTE') {
  //    let paras;
  //    if (p.find('p')) {
  //      paras = fromPara(p.find('p'));
  //    } else {
  //      paras = [{
  //        'type': 'text',
  //        'value': p.text(),
  //      }];
  //    }
  //    return [{
  //      'type': 'blockquote',
  //      'paragraphs': paras,
  //    }];
  //  // underline
  //  } else if (p[0].tagName === 'U') {
  //    return [{'type': 'underline', 'value': p.text()}];
  //  } else if (isMixed(p)) {
  //    return fromMixed(p);
  //  } else if (isMultiline(p)) {
  //    return [fromMultiline(p)];
  //  } else if (children.length > 1) {
  //    return children.map((_, c) => fromElement($(c))).toArray();
  //  }
  //} else {
  //  const text = p.text();
  //  // &nbsp;
  //  if (text.length === 1 && text.charCodeAt(0) === 160) {
  //    return [{'type': 'br'}];
  //  } else {
  //    return [{
  //      'type': 'text',
  //      'value': p.text(),
  //    }];
  //  }
  //}
  //if (p[0].tagName === 'BR') {
  //  return [{'type': 'br'}];
  //}
  //g_debug_post.invalid = true;
  //return TODO_PREIX + p.html();
}

function fromElement(elem, caller) {
  caller += ' fromElement';
  if (isTextNode(elem)) {
    return fromTextNode(elem, caller);
  } else if (isSimpleSpan(elem)) {
    return fromSimpleSpan(elem, caller);
  } else if (isLinkedImage(elem)) {
    return fromLinkedImage(elem, caller);
  } else if (isStrong(elem)) {
    return fromStrong(elem, caller);
  } else if (isLink(elem)) {
    return fromLink(elem, caller);
  } else if (isImage(elem)) {
    return fromImage(elem, caller);
  } else if (elem[0].tagName === 'BR') {
    return {type: 'br', DEBUG___caller: caller};
  } else if (elem[0].tagName === 'U') {
    return {type: 'underline', value: elem.text(), DEBUG___caller: caller};
  } else if (isSimple(elem)) {
    return fromTextNode(elem, caller);
  } else if (isNewlinePara(elem)) {
    return {'type': 'br', 'DEBUG___caller': caller};
  } else if (isSpanMultiline(elem)) {
    return fromMultiline($(elem.children()[0]), caller);
  } else if (elem[0].tagName === 'PRE') {
    return fromMultiline(elem, caller);
  }
  console.log(elem);
  g_debug_post.invalid = elem.html();
  return {'type': 'unknown', 'DEBUG___caller': caller};
}

function isSpanMultiline(elem) {
  const children = elem.children();
  return children.length === 1
    && children[0].tagName === 'SPAN'
    && isMultiline($(children[0]))
}

function isMixed(elem) {
  return elem.contents().toArray().filter(
    c => c.nodeType === Node.TEXT_NODE && c.nodeValue.trim()
  ).length > 0;
}

function isAllSpan(elem) {
  return elem.children().toArray().every(c => c.tagName === 'SPAN');
}

function isImage(elem) {
  return elem.find('img').length > 0 || elem[0].tagName === 'IMG';
}

function fromImage(elem, caller) {
  let img = elem.find('img');
  if (img.length === 0) {
    img = $(elem[0]);
  }
  return {
    type: 'img',
    src: img.attr('src'),
    caller: caller + ' fromImage',
  }
}

function isTextNode(elem) {
  return elem.length === 1
    && elem[0].nodeType === Node.TEXT_NODE
}

function isLinkedImage(elem) {
  return elem.find('img').length && (
    elem[0].tagName === 'A' || elem.find('a').length);
}

function isLinkedImagePara(elem) {
  const children = nonBrChildrenOf(elem);
  return children.length === 1
    && children[0].tagName === 'A'
    && elem.find('img').length
}

function isSimpleSpan(elem) {
  return elem[0].tagName === 'SPAN'
    && elem.children().length === 0
    && hasText(elem)
}

function fromSimpleSpan(elem) {
  return fromTextNode(elem);
}

function fromLinkedImagePara(elem, caller) {
  caller += ' fromLinkedImagePara';
  return fromLinkedImage(elem, caller);
}

function fromLinkedImage(elem, caller) {
  const a = elem[0].tagName === 'A' ? elem :elem.find('a');
  const img = elem.find('img');
  return {
    type: 'a-img',
    href: a.attr('href'),
    src: img.attr('src'),
    caller: caller + ' fromLinkedImage',
  };
}

function isLinkPara(elem) {
  /* post1 #0
    <div class="rich-content">
      <p>
        <a href=".." target="_blank">foo bar</a>
      </p>
      <p>
        <a href=".." target="_blank"></a>
        <a href=".." target="_blank">foo bar</a>
      </p>
    </div>
   */
  if (elem.length === 1
    && elem[0].tagName === 'A'
    && elem.children().length === 1
    && elem.children()[0].tagName === 'BR'
  ) {
    return true;
  }
  let children = elem.children().toArray();
  if (elem.find('br:last-child').length) {
    children.splice(children.length - 1, 1);
  }
  const hasA = elem.has('a').length !== 0;
  const allA = children.every(c => c.tagName === 'A');
  return !hasText(elem) && hasA && allA;
}

function fromLinkPara(elem, caller) {
  caller += ' fromLinkPara';
  if (elem[0].tagName === 'A') {
    return [fromLink(elem, caller)];
  }
  return (elem.children().toArray()
      .filter(c => $(c).text().trim())
      .map(c => fromLink($(c), caller))
    || {type: 'oops', DEBUG___caller: caller}
  );
}

function isSimple(elem) {
  if (elem.children().length === 0 && hasText(elem)
    || elem.children().length === 1
    && !hasText(elem)
    && isSimple($(elem.children()[0]))
  ) {
    return true;
  } else {
    return false;
  }
}

function isSimplePara(elem) {
  /* post1 #1
    <div class="rich-content">
      <p></p>
      <p>笑cry</p>
      <p></p>
    </div>
   */
  return elem.length === 1
    && elem[0].tagName === 'P'
    && elem.children().length === 0
}

function fromSimplePara(p, caller) {
  caller += ' fromSimplePara';
  return [{
    type: 'text',
    value: fromTextNode(p).value,
    DEBUG___caller: caller,
  }];
}

function isSpanPara(elem) {
  /* post1 #2
    <div class="rich-content">
      <p><span>结束啦结束啦</span></p>
      <p><span><br></span></p>
      <p><span>之前的qq报版本...</span></p>
    </div>
   */
  const children = elem.children();
  return elem.length === 1
    && children.length === 1
    && children[0].tagName === 'SPAN';
}

function fromSpanPara(p, caller) {
  caller += ' fromSpanPara';
  if (p.find('br').length) {
    return [{type: 'br'}];
  } else {
    return [{
      type: 'text',
      value: p.text(),
      DEBUG___caller: caller,
    }];
  }
}

function isMultiPart(elem) {
  /* post1 #35
    <div class="rich-content">
      <p>
        <a href="...">补班</a>
        "&nbsp;&nbsp;&nbsp;&nbsp;(2010.2~2010.5)"
      </p>
    </div>
   */
  return hasText(elem) || hasChildren(elem)
}

function fromMultiPart(elem, caller) {
  caller += ' fromMultiPart';
  let res = elem.contents().toArray().map(c => fromElement($(c), caller));
  if (res.length === 0) {
    return {
      type: 'oops',
      DEBUG___caller: caller,
    };
  } else {
    return res;
  }
}

function isImagePara(elem) {
  /* post1 #10
    <div class="rich-content">
      <p><Image>结束啦结束啦</Image></p>
      <p><Image><br></Image></p>
      <p><Image>之前的qq报版本...</Image></p>
    </div>
    <div class="rich-content">
      <p>
        <span><img src="..."></span>
        <br>
      </p>
      <p>我擦哦，枪花还唱过这歌？</p>
    </div>
   */
  const children = nonBrChildrenOf(elem);
  return children.length === 1
    && children[0].tagName === 'SPAN'
    && $(children[0]).children().length
    && $(children[0]).find('img').length
}

function fromImagePara(elem, caller) {
  caller += ' fromImagePara';
  return [{
    type: 'img',
    src: elem.find('img').attr('src'),
    DEBUG___caller: caller,
  }];
}

function isLink(elem) {
  return elem[0].tagName === 'A';
}

function fromLink(elem, caller) {
  caller += ' fromLink';
  const a = elem;
  return {
    'type': 'a',
    'href': a.attr('href'),
    'text': a.text(),
    'DEBUG___caller': caller,
  };
}

function isStrong(elem) {
  return elem[0].tagName === 'STRONG';
}

function fromStrong(elem, caller) {
  caller += ' fromStrong';
  return {
    'type': 'strong',
    'value': elem.text(),
    'DEBUG___caller': caller,
  };
}

function isSpan(elem) {
  return elem[0].tagName === 'SPAN';
}

function fromSpan(elem, caller) {
  caller += ' fromSpan';
  return {
    'type': 'span',
    'value': elem.text(),
    'DEBUG___caller': caller,
  };
}

function isBlockquote(elem) {
  return elem.length === 1
    && elem[0].tagName === 'BLOCKQUOTE'
}

function fromBlockquote(elem, caller) {
  caller += ' fromBlockquote'
  return {
    'type': 'blockquote',
    'paragraphs': fromParas(elem, caller),
  };
}

function isNewlinePara(elem) {
  if (elem.length === 1 && elem[0].tagName === 'BR') {
    return true;
  }

  const text = elem.text();
  const isBlankLineForNewLine = isSimplePara(elem)
    && text.trim() === '';
  if (isBlankLineForNewLine) {
    return true;
  }
  const isBrPara = !hasText(elem)
    && elem.children().length === 1
    && elem.children()[0].tagName === 'BR'
  return isBrPara;
}

function fromTextNode(elem, caller) {
  caller += ' fromTextNode';
  let text = elem.text()
    .replace(/\n|\t/g, '')
    .replace(/\xa0/g, '&nbsp;')
    .replace(/^\+ /, '&plus;&nbsp;')
    .replace(/\</g, '&lt;')
    .replace(/\[/g, '&#91;')
    .replace(/_/g, '&#95;')
    .replace(/\`/g, '&#96;')
    .replace(/\*/g, '&#42;');
  return {
    type: 'text',
    value: text,
    DEBUG___caller: caller,
  }
}

function nonBrChildrenOf(elem) {
  return elem.children().toArray().filter(c => c.tagName !== 'BR');
}

function hasText(elem) {
  return elem.contents().toArray().filter(c =>
    c.nodeType === Node.TEXT_NODE && c.nodeValue.trim()
  ).length > 0
}

function hasChildren(elem) {
  return elem.children().length > 0
}

function markdownParas(paras) {
  let md = '';
  for (const para of paras) {
    md += markdownPara(para) + '\n\n';
  }
  return md;
}

function markdownPara(parts) {
  let md = '';
  if (parts[Symbol.iterator] === undefined) {
    g_debug_post.invalid = 'markdown para is not an array';
    return '<span style="background: red">markdown para is not an array</span>';
  }
  for (const part of parts) {
    md += markdownPart(part);
  }
  return md;
}

function markdownPart(part) {
  if (part.type === 'a') {
    const a = part;
    return `[${a.text}](${a.href})`;
  } else if (part.type === 'a-img'){
    return `<a href="${part.href}"><img src=${prefixedImageSrc(part.src)}></a>`;
  } else if (part.type === 'text'){
    const text = part;
    return text.value;
  } else if (part.type === 'blockquote') {
    const blockquote = part;
    return '\n' + blockquote.paragraphs.map(para => {
      return '> ' + markdownPara(para) + '\n';
    }).join('\n') + '\n';
  } else if (part.type === 'img') {
    return markdownImage(part);
  } else if (part.type === 'br') {
    return '<br>';
  } else if (part.type === 'strong') {
    return `<strong>${part.value}</strong>`;
  } else if (part.type === 'underline') {
    return `<u>${part.value}</u>`;
  }
  g_debug_post.invalid = 'unknown markdown part when making paragraph';
  return ('<span style="background: red">unknown markdown para part '
    + '<em>' + part.type + '</em></span>');
}

function markdownImage(img) {
  return `![diandian img](${prefixedImageSrc(img.src)})`;
}

function prefixedImageSrc(src) {
  return '/file/images/diandian/' + src;
}

import React, { Component } from 'react';
import $ from 'jquery';

class App extends Component {
  state = {
    notes: null,
  }

  componentDidMount = async () => {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    const res = await fetch('/page', {
      method: 'POST',
      headers: headers,
    });
    if (res.status === 200) {
      const notes = await res.json();
      for (const note of notes) {
        note.content = `<div>${note.content}</div>`
        const content = note.content;
        if (content.match('img')) {
          const e = $('<div>' + content + '</div>');
          for (let img of e.find('img').toArray()) {
            img = $(img);
            const href = '/file/' + img.attr('md5');
            img.attr('src', href);
            img.removeAttr('md5');
            const a = img.parent();
            a.attr('href', href);
          }
          note.content = e.html();
        }
      }
      notes.reverse();
      this.postNotes(notes);
      this.setState({notes: notes});
    }
  }

  render() {
    const notes = this.state.notes;
    if (!notes) return null;
    const noteComps = notes.map(note => {
      let commentComps = null;
      if (note.comments) {
        commentComps = note.comments.map(comment => {
          let content = comment.content;
          content = content.replace('\n', '<br/>');
          return (
            <div
              style={{
                border: '1px solid black',
                margin: '1em',
                fontSize: '.9em',
              }}
            >
              <div>
                <div>COMMENT</div>
                <img src={`/file/` + comment.avatar_md5}/>
                <span>{comment.nickname}</span>
                <span style={{marginLeft: '2em'}}>{comment.ctime}</span>
              </div>
              <div dangerouslySetInnerHTML={{__html: content}}/>
            </div>
          );
        });
      }
      return (
        <div key={note.ctime}
          style={{
            margin: '1em',
            padding: '2em',
            width: '40rem',
            boxShadow: '0 0 5px #ccc',
          }}
        >
          {note.title ? <h1>{note.title}</h1> : null}
          <div dangerouslySetInnerHTML={{__html: note.content}}/>
          {commentComps}
        </div>
      );
    });
    return (
      <div className="App"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {noteComps}
      </div>
    );
  }

  postNotes = async (notes) => {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    await fetch('/all', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({notes: notes}),
    });
  }
}

export default App;

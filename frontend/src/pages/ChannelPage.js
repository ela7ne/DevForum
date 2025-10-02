import React, { useEffect, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  Alert,
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  Collapse
} from 'react-bootstrap';


const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

function ChannelPage() {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [posts, setPosts] = useState([]);
  const [responses, setResponses] = useState([]);

  const [topic, setTopic] = useState('');
  const [postData, setPostData] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [showNewPostForm, setShowNewPostForm] = useState(false);

  const [replyData, setReplyData] = useState('');
  const [replyImage, setReplyImage] = useState(null);
  const [replyTo, setReplyTo] = useState('');
  const [replyError, setReplyError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchType, setSearchType] = useState('content');

  const [userStats, setUserStats] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [channelError, setChannelError] = useState('');

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');


  const userRole = localStorage.getItem('role');
  

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel) fetchAllData();
  }, [selectedChannel]);

  const fetchChannels = async () => {
    const res = await fetch(`${backendUrl}/channels`);
    const data = await res.json();
    setChannels(data.channels);
    
  };

  const fetchAllData = async () => {
    try {
      const res = await fetch(`${backendUrl}/alldata`);
      const data = await res.json();
      const filteredPosts = (data.posts || [])
        .filter(p => p.channelId === selectedChannel._id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setPosts(filteredPosts);
      setResponses(data.responses || []);
    } catch (err) {
      console.error('fetchAllData error:', err);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !newChannelDescription.trim()) {
      setChannelError('Please enter both a channel name and a description.');
      return;
    }
    try {
      const response = await fetch(`${backendUrl}/createchannel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newChannelName,
          description: newChannelDescription
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Create Channel Error:', errorText);
        setChannelError('Server error while creating channel.');
        return;
      }
      const result = await response.json();
      await fetchChannels();
      setSelectedChannel({
        _id: result.id,
        name: newChannelName,
        description: newChannelDescription
      });
      setNewChannelName('');
      setNewChannelDescription('');
      setChannelError('');
    } catch (err) {
      console.error('Unexpected error creating channel:', err);
      setChannelError('Unexpected error. Please try again.');
    }
  };  

  const handleNewPostSubmit = async (e) => {
    e.preventDefault();
    if (!topic.trim() || !postData.trim()) {
      setToastMessage('Please enter both a title and a description before posting.');
      setShowToast(true);
      return;
    }    
  
    const avatar = localStorage.getItem('avatar');
    let image = null;
  
    if (postImage) image = await convertToBase64(postImage);
  
    await fetch(`${backendUrl}/postmessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      credentials: 'include', 
      body: JSON.stringify({
        topic,
        data: postData,
        channelId: selectedChannel._id,
        image,
        avatar
      })
    });
  
    setTopic('');
    setPostData('');
    setPostImage(null);
    setShowNewPostForm(false);
    fetchAllData();
  };
  

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyData.trim()) {
      setReplyError('Reply must include some text.');
      return;
    }

    const avatar = localStorage.getItem('avatar');
    let image = null;
    if (replyImage) image = await convertToBase64(replyImage);

    try {
      await fetch(`${backendUrl}/postresponse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
        body: JSON.stringify({
          parentId: replyTo,
          data: replyData,
          image,
          avatar
        })
      });
      

      setReplyData('');
      setReplyImage(null);
      setReplyTo('');
      setReplyError('');
      fetchAllData();
    } catch (err) {
      console.error('Reply submission failed:', err);
      setReplyError('Something went wrong while submitting your reply.');
    }
  };

  const rate = async (id, vote) => {
    try {
      await fetch(`${backendUrl}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
        body: JSON.stringify({ id, vote })
      });
      fetchAllData();
    } catch (err) {
      console.error('Rating failed:', err);
    }
  };

  const handleDeleteChannel = async (id) => {
    if (!window.confirm("Are you sure you want to delete this channel?")) return;
  
    try {
      const res = await fetch(`${backendUrl}/admin/delete/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
  
      if (res.ok) {
        alert('Channel deleted.');
        setSelectedChannel(null);
        fetchChannels();
      } else {
        alert('Failed to delete channel.');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Something went wrong.');
    }
  };
  

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const endpoint = searchType === 'content' ? 'search/content' : 'search/user';
    const res = await fetch(`${backendUrl}/${endpoint}?${searchType === 'content' ? 'q' : 'username'}=${searchQuery}`);
    const data = await res.json();
    setSearchResults(data.results || []);
  };

  const fetchTopUsers = async () => {
    try {
      const res = await fetch(`${backendUrl}/stats/top-users`);
      const data = await res.json();
      setUserStats(data.topByPosts || []);
    } catch (err) {
      console.error('Failed to fetch top users:', err);
    }
  };

  const renderReplyForm = (parentId) => (
    <>
      {replyError && (
        <Alert variant="danger" onClose={() => setReplyError('')} dismissible>
          {replyError}
        </Alert>
      )}
      <Form onSubmit={handleReplySubmit} className="mt-2">
        <Form.Control
          as="textarea"
          rows={2}
          placeholder="Reply."
          value={replyData}
          onChange={(e) => setReplyData(e.target.value)}
          className="mb-2"
        />
        <Form.Control type="file" onChange={(e) => setReplyImage(e.target.files[0])} />
        <Button type="submit" size="sm" className="mt-2">Submit Reply</Button>
      </Form>
    </>
  );

  const renderReplies = (parentId, level = 1) => {
    const children = responses.filter(r => r.parentId === parentId);
    return children.map(r => (
      <div key={r._id} style={{ marginLeft: `${level * 20}px` }}>
        <Card className="mb-2 shadow-sm">
          <Card.Body>
            <div className="d-flex align-items-start mb-3">
              <img
                src={r.avatar || '/default-avatar.png'}
                alt="avatar"
                className="rounded-circle me-3"
                width="40"
                height="40"
              />
              <div>
                <div className="mb-1">
                  <strong>{r.displayName}</strong>{' '}
                  <span className="text-muted" style={{ fontSize: '0.9em' }}>
                    @{r.author} • {r.skillLevel || 'Unrated'} • {new Date(r.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="mb-2">{r.data}</p>
                {r.image && <img src={r.image} alt="reply-img" className="img-fluid rounded" />}
              </div>
            </div>
          </Card.Body>
          <Card.Footer>
            <Button size="sm" variant="link" onClick={() => setReplyTo(r._id)}>Reply</Button>
            <Button size="sm" onClick={() => rate(r._id, 'up')}>👍 {r.upvotes || 0}</Button>
            <Button size="sm" onClick={() => rate(r._id, 'down')}>👎 {r.downvotes || 0}</Button>
            {replyTo === r._id && renderReplyForm(r._id)}
          </Card.Footer>
        </Card>
        {renderReplies(r._id, level + 1)}
      </div>
    ));
  };

  return (
    <Container>
    <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
      <Toast
        bg="warning"
        onClose={() => setShowToast(false)}
        show={showToast}
        delay={4000}
        autohide
      >
        <Toast.Header>
          <strong className="me-auto">Validation Error</strong>
        </Toast.Header>
        <Toast.Body>{toastMessage}</Toast.Body>
      </Toast>
    </ToastContainer>
      <h2 className="my-4">Select or Create a Channel</h2>
      <Row className="mb-4">
        <Col md={6}>
          <Form.Select onChange={(e) => {
            <ul className="list-group mb-3">
            {channels.map(ch => (
              <li key={ch._id} className="list-group-item d-flex justify-content-between align-items-center">
                <span onClick={() => setSelectedChannel(ch)} style={{ cursor: 'pointer' }}>{ch.name}</span>
                {userRole === 'admin' && (
                  <Button variant="danger" size="sm" onClick={() => handleDeleteChannel(ch._id)}>
                    Delete
                  </Button>
                )}
              </li>
            ))}
          </ul>
            const channel = channels.find(c => c._id === e.target.value);
            setSelectedChannel(channel);
          }}>
            <option>Select Channel</option>
            {channels.map(ch => (
              <option key={ch._id} value={ch._id}>{ch.name}</option>
            ))}
          </Form.Select>
        </Col>
        <Col md={6}>
          {channelError && (
            <Alert variant="danger" onClose={() => setChannelError('')} dismissible>
              {channelError}
            </Alert>
          )}
          <Form className="d-flex gap-2" onSubmit={(e) => { e.preventDefault(); handleCreateChannel(); }}>
            <Form.Control
              placeholder="New Channel Name"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
            />
            <Form.Control
              placeholder="Description"
              value={newChannelDescription}
              onChange={(e) => setNewChannelDescription(e.target.value)}
            />
            <Button type="submit">Create</Button>
          </Form>
        </Col>
      </Row>

      <Form className="mb-4 d-flex gap-2">
        <Form.Control
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Form.Select value={searchType} onChange={(e) => setSearchType(e.target.value)}>
          <option value="content">By Content</option>
          <option value="user">By User</option>
        </Form.Select>
        <Button onClick={handleSearch}>Search</Button>
      </Form>

      {searchResults.length > 0 && (
        <>
          <h5>Search Results:</h5>
          {searchResults.map(result => (
            <Card key={result._id} className="mb-3">
              <Card.Body>
                <strong>{result.topic}</strong>
                <p>{result.data}</p>
              </Card.Body>
            </Card>
          ))}
        </>
      )}

      <Button
        className="mb-3"
        variant={showLeaderboard ? 'secondary' : 'primary'}
        onClick={() => {
          if (!showLeaderboard) fetchTopUsers();
          setShowLeaderboard(!showLeaderboard);
        }}
      >
        {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
      </Button>

      {showLeaderboard && (
        <div className="mb-4">
          <h5>Top Users by Post Count</h5>
          <ul className="list-group">
            {userStats.map(([username, stats], i) => (
              <li key={username} className="list-group-item d-flex justify-content-between align-items-center">
                <span>
                  <strong>{i + 1}. {username}</strong> — {stats.posts} posts
                </span>
                <span className="badge bg-success">
                  👍 {stats.upvotes} / 👎 {stats.downvotes}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedChannel && (
        <>
          <h3>Channel: {selectedChannel.name}</h3>
          <Button onClick={() => setShowNewPostForm(!showNewPostForm)} className="my-3">
            {showNewPostForm ? 'Cancel' : 'New Post'}
          </Button>
          <Collapse in={showNewPostForm}>
            <Card body className="mb-3">
              <Form onSubmit={handleNewPostSubmit}>
                <Form.Group className="mb-2">
                  <Form.Label>Topic</Form.Label>
                  <Form.Control value={topic} onChange={e => setTopic(e.target.value)} />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Post</Form.Label>
                  <Form.Control as="textarea" value={postData} onChange={e => setPostData(e.target.value)} />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Screenshot (optional)</Form.Label>
                  <Form.Control type="file" onChange={e => setPostImage(e.target.files[0])} />
                </Form.Group>
                <Button type="submit">Submit</Button>
              </Form>
            </Card>
          </Collapse>

          <h4>Posts</h4>
          {posts.map(p => (
            <Card key={p._id} className="mb-3 shadow-sm">
              <Card.Body>
                <div className="d-flex align-items-start mb-3">
                  <img
                    src={p.avatar || '/default-avatar.png'}
                    alt="avatar"
                    className="rounded-circle me-3"
                    width="50"
                    height="50"
                  />
                  <div>
                    <div className="mb-1">
                    <strong>
                      <Link to={`/user/${p.author}`} className="text-decoration-none">
                        {p.displayName}
                      </Link>
                    </strong>
                      <span className="text-muted">
                        @{p.author} • {p.skillLevel || 'Unrated'} • {new Date(p.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <h5 className="mb-1">{p.topic}</h5>
                    <p className="mb-2">{p.data}</p>
                    {p.image && <img src={p.image} alt="screenshot" className="img-fluid rounded" />}
                  </div>
                </div>
              </Card.Body>
              <Card.Footer>
                <Button size="sm" variant="link" onClick={() => setReplyTo(p._id)}>Reply</Button>
                <Button size="sm" onClick={() => rate(p._id, 'up')}>👍 {p.upvotes || 0}</Button>
                <Button size="sm" onClick={() => rate(p._id, 'down')}>👎 {p.downvotes || 0}</Button>
                {replyTo === p._id && renderReplyForm(p._id)}
                <div className="mt-2">
                  {renderReplies(p._id)}
                </div>
              </Card.Footer>
            </Card>
          ))}
        </>
      )}
    </Container>
  );
}

export default ChannelPage;

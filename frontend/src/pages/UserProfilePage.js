import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Card, Spinner } from 'react-bootstrap';

const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

function UserProfilePage() {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRes = await fetch(`${backendUrl}/user/${username}`);
        const userData = await userRes.json();
        setUser(userData);
  
        const postRes = await fetch(`${backendUrl}/search/user?username=${username}`);
        const { results: userPosts } = await postRes.json();
        setPosts(userPosts.filter(p => p.type === 'post'));
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };
  
    fetchUserData();
  }, [username]);
  

  if (!user) return <Spinner animation="border" />;

  return (
    <Container className="py-4">
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <div className="d-flex align-items-center">
            <img
              src={user.avatar || '/default-avatar.png'}
              alt="avatar"
              className="rounded-circle me-3"
              width="60"
              height="60"
            />
            <div>
              <h4>{user.displayName}</h4>
              <p className="mb-1">@{user.username}</p>
              <p className="text-muted mb-0">{user.skillLevel || 'Unrated'} • {user.role}</p>
            </div>
          </div>
          <hr />
        </Card.Body>
      </Card>

      <h5>{user.displayName}'s Posts</h5>
      {posts.map(post => (
        <Card key={post._id} className="mb-3">
          <Card.Body>
            <strong>{post.topic}</strong>
            <p>{post.data}</p>
          </Card.Body>
        </Card>
      ))}
    </Container>
  );
}

export default UserProfilePage;

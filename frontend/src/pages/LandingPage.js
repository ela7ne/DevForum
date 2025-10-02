import React from 'react';
import { Container, Button, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();
  const displayName = localStorage.getItem('displayName');
  const token = localStorage.getItem('token');

  return (
    <Container className="py-5">
      <div className="text-center mb-5">
        <h1 className="fw-bold">🧠 DevForum</h1>
        <p className="lead">
          A collaborative space for developers to ask questions, share ideas, and grow together.
        </p>
        {token ? (
          <p className="text-success">Welcome back, <strong>{displayName}</strong> 👋</p>
        ) : (
          <p className="text-muted">Sign in to start posting or browsing developer topics.</p>
        )}
        <Button variant="primary" size="lg" onClick={() => navigate('/channels')}>
          {token ? 'Explore Channels' : 'Get Started'}
        </Button>
      </div>

      <Row className="g-4">
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <h5 className="card-title">📚 Organized Channels</h5>
              <p className="card-text">
                Join topic-specific channels to stay focused and relevant. Or create your own!
              </p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <h5 className="card-title">🔍 Powerful Search</h5>
              <p className="card-text">
                Search content by keyword or user to find exactly what you need, instantly.
              </p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <h5 className="card-title">🏆 Community Rankings</h5>
              <p className="card-text">
                Upvote helpful posts, climb the leaderboard, and build your rep.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="text-center mt-5 text-muted">
        <small>Built with sweat and tears using React, Node, CouchDB & Docker</small>
      </div>
    </Container>
  );
}

export default LandingPage;

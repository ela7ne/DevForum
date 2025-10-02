import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';

const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const AccountPage = () => {
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [skillLevel, setSkillLevel] = useState('');

  useEffect(() => {
    const storedName = localStorage.getItem('displayName');
    const storedAvatar = localStorage.getItem('avatar');
    const storedSkill = localStorage.getItem('skillLevel');
    if (storedName) setDisplayName(storedName);
    if (storedAvatar) setPreview(storedAvatar);
    if (storedSkill) setSkillLevel(storedSkill);
  }, []);

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let avatarBase64 = null;
    if (avatar) avatarBase64 = await convertToBase64(avatar);

    try {
      const res = await fetch(`${backendUrl}/account/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
        body: JSON.stringify({
          displayName,
          avatar: avatarBase64,
          skillLevel,
        })
      });

      const result = await res.json();
      if (result.success) {
        localStorage.setItem('displayName', result.displayName);
        localStorage.setItem('avatar', result.avatar);
        localStorage.setItem('skillLevel', result.skillLevel);
        setMessage('Profile updated!');
        if (avatarBase64) setPreview(avatarBase64);
      } else {
        setMessage('Failed to update profile.');
      }
    } catch (err) {
      console.error('Update failed:', err);
      setMessage('Server error.');
    }
  };

  return (
    <Container className="my-5" style={{ maxWidth: '600px' }}>
      <h2 className="mb-4">Account Settings</h2>

      {message && (
        <Alert variant={message.includes('updated') ? 'success' : 'danger'}>
          {message}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Display Name</Form.Label>
          <Form.Control
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Profile Picture</Form.Label>
          <Form.Control
            type="file"
            accept="image/*"
            onChange={(e) => setAvatar(e.target.files[0])}
          />
        </Form.Group>

        {preview && (
            <div div className="mb-3">
                <Form.Label className="d-block">Preview</Form.Label>
                <img
                    src={preview}
                    alt="preview"
                    className="rounded-circle"
                    style={{
                        width: '100px',
                        height: '100px',
                        objectFit: 'cover',
                        border: '2px solid #ccc'
                    }}
                />
            </div>
        )}
        <Form.Group className="mb-3">
          <Form.Label>Skill Level</Form.Label>
          <Form.Select
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value)}
          >
            <option value="">Select Skill Level</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Expert">Expert</option>
          </Form.Select>
        </Form.Group>

        <Button type="submit" variant="primary">
          Save Changes
        </Button>
      </Form>
    </Container>
  );
};

export default AccountPage;

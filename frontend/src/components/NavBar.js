import React from 'react';
import { Container, Navbar, Nav, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

function AppNavBar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const displayName = localStorage.getItem('displayName');

  console.log('NavBar token:', token); // Debugging
  console.log('NavBar displayName:', displayName); // Debugging

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container>
        <Navbar.Brand as={Link} to="/">DevForum</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {token ? (
              <>
                <Navbar.Text className="me-3 text-white">
                  Signed in as <strong>{displayName}</strong>
                </Navbar.Text>

                <Button
                  variant="outline-light"
                  as={Link}
                  to="/channels"
                  className="me-2"
                >
                  Channels
                </Button>

                <Button
                  variant="outline-light"
                  as={Link}
                  to="/account"
                  className="me-2"
                >
                  Account
                </Button>

                <Button variant="outline-light" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline-light" as={Link} to="/login" className="me-2">
                  Login
                </Button>
                <Button variant="light" as={Link} to="/register">
                  Register
                </Button>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavBar;
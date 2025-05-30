import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState } from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import MovieSearch from './components/Movies/MovieSearch';
import MovieRecommendations from './components/Movies/MovieRecommendations';
import './movie.css';

function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <Navbar expand="lg" className="navbar" sticky="top">
        <Container>
          <Navbar.Brand as={Link} to="/">
            <img src="/images/logo.png" alt="MovieApp" style={{ height: '40px' }} />
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/">Trang chủ</Nav.Link>
              <Nav.Link as={Link} to="/search">Tìm kiếm</Nav.Link>
              {user ? (
                <Nav.Link onClick={() => setUser(null)}>Đăng xuất</Nav.Link>
              ) : (
                <>
                  <Nav.Link as={Link} to="/login">Đăng nhập</Nav.Link>
                  <Nav.Link as={Link} to="/register">Đăng kí</Nav.Link>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Routes>
        <Route path="/" element={<MovieRecommendations />} />
        <Route path="/search" element={<MovieSearch />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register setUser={setUser} />} />
      </Routes>

      <footer className="footer">
        <Container>
          <p>© 2025 MovieApp. All rights reserved. <a href="#">Contact Us</a></p>
        </Container>
      </footer>
    </Router>
  );
}

export default App;
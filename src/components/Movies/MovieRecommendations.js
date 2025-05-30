import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Spinner, Carousel, Modal, Button } from 'react-bootstrap';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import '../../movie.css';

const MovieRecommendations = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [watchLinkAvailable, setWatchLinkAvailable] = useState(true);
  const [watchLink, setWatchLink] = useState('');
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [userName, setUserName] = useState(''); // Thêm state cho tên tài khoản
  const [userId, setUserId] = useState('');     // Thêm state cho userId
  const tmdbApiKey = process.env.REACT_APP_TMDB_API_KEY;

  // Hàm lấy thông tin người dùng và đề xuất phim
  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth();
      let userId = null;
      let recommendations = [];

      await new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
          if (user) {
            userId = user.uid;
            setUserId(userId);              // Cập nhật userId
            setUserName(user.displayName || 'Anonymous'); // Cập nhật tên (hoặc 'Anonymous' nếu không có)
            console.log('Current userId:', userId);
            console.log('Current userName:', user.displayName);
          } else {
            setUserId('');
            setUserName('Guest');
          }
          resolve();
        });
      });

      if (userId) {
        // Lấy danh sách đánh giá từ MongoDB
        const ratingsResponse = await axios.get(`http://localhost:5000/api/ratings/${userId}`);
        const userRatings = ratingsResponse.data;
        console.log('User ratings:', userRatings);

        const response = await axios.post('http://localhost:5000/recommend/collaborative', {
          userId: userId,
          ratings: userRatings
        }, { timeout: 10000 });

        if (response.data && Array.isArray(response.data.recommendations)) {
          recommendations = response.data.recommendations;
        } else {
          throw new Error('Invalid response format from collaborative API');
        }
      } else {
        const response = await axios.get(`http://localhost:5000/recommend/content?title=${encodeURIComponent('The Dark Knight')}`, { timeout: 10000 });
        if (response.data && Array.isArray(response.data.recommendations)) {
          recommendations = response.data.recommendations;
        } else {
          throw new Error('Invalid response format from content API');
        }
      }

      const cachedMovies = JSON.parse(localStorage.getItem('tmdbMoviesCache') || '{}');
      const moviesToFetch = [];
      const movieDetails = [];

      for (const rec of recommendations) {
        const { title, release_date } = rec;
        const cacheKey = `${title}-${release_date || ''}`;
        
        if (cachedMovies[cacheKey]) {
          movieDetails.push(cachedMovies[cacheKey]);
          continue;
        }

        moviesToFetch.push({ title, release_date, cacheKey });
      }

      if (moviesToFetch.length > 0) {
        const fetchedMovies = await Promise.all(
          moviesToFetch.map(async ({ title, release_date, cacheKey }) => {
            const year = release_date ? release_date.split('-')[0] : null;
            const url = year
              ? `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(title)}&year=${year}`
              : `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(title)}`;

            const tmdbResponse = await axios.get(url);
            const results = tmdbResponse.data.results;

            if (results && results.length > 0) {
              let bestMatch = results[0];
              for (const movie of results) {
                if (
                  movie.title.toLowerCase() === title.toLowerCase() ||
                  movie.original_title.toLowerCase() === title.toLowerCase()
                ) {
                  bestMatch = movie;
                  break;
                }
              }

              const movieData = {
                id: bestMatch.id,
                title: bestMatch.title,
                poster_path: bestMatch.poster_path,
                release_date: bestMatch.release_date,
                overview: bestMatch.overview
              };

              cachedMovies[cacheKey] = movieData;
              return movieData;
            }
            return null;
          })
        );

        localStorage.setItem('tmdbMoviesCache', JSON.stringify(cachedMovies));
        movieDetails.push(...fetchedMovies.filter(movie => movie !== null));
      }

      const uniqueMovies = Array.from(
        new Map(movieDetails.map(movie => [movie.id, movie])).values()
      );

      setMovies(uniqueMovies);
    } catch (err) {
      setError(`Failed to fetch recommendations. Please try again. Error: ${err.message}`);
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleShowDetails = async (movie) => {
    setSelectedMovie(movie);
    setShowDetails(true);
    setRating(0);
    setRatingSubmitted(false);
    await fetchWatchLink(movie.id, movie.title);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedMovie(null);
    setWatchLinkAvailable(true);
    setWatchLink('');
    setRating(0);
    setRatingSubmitted(false);
  };

  const fetchWatchLink = async (movieId, movieTitle) => {
    try {
      const response = await axios.get(
        `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${tmdbApiKey}`
      );
      const providers = response.data.results['VN'];
      if (providers && providers.flatrate && providers.flatrate.length > 0) {
        setWatchLink(providers.flatrate[0].link);
        setWatchLinkAvailable(true);
      } else {
        setWatchLink(`https://www.google.com/search?q=${encodeURIComponent(`watch ${movieTitle} online`)}`);
        setWatchLinkAvailable(true);
      }
    } catch (err) {
      console.error('Error fetching watch providers:', err);
      setWatchLink('');
      setWatchLinkAvailable(false);
    }
  };

  const handleWatchMovie = () => {
    if (watchLink) {
      window.open(watchLink, '_blank');
    }
  };

  const handleSubmitRating = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user && selectedMovie && rating > 0) {
      try {
        const response = await axios.post('http://localhost:5000/api/ratings', {
          userId: user.uid,
          movieId: selectedMovie.id,
          rating: rating,
          title: selectedMovie.title,
          timestamp: new Date().toISOString()
        });
        if (response.status === 200) {
          setRatingSubmitted(true);
          setRating(0);
          await fetchRecommendations(); // Làm mới danh sách đề xuất
        }
      } catch (err) {
        setError(`Failed to submit rating. Error: ${err.message}`);
        console.error('Error submitting rating:', err);
      }
    } else {
      setError('Please log in and select a rating before submitting.');
    }
  };

  return (
    <Container className="py-5 movie-page">
      {/* Hiển thị thông tin người dùng */}
      <div className="user-info text-center mb-4">
        <h4>
          Xin chào, <span className="text-primary">{userName}</span>!
          <br />
          User ID: <span className="text-info">{userId}</span>
        </h4>
      </div>

      <h2 className="section-title">Bạn có thể thích</h2>
      {error && <p className="text-danger text-center">{error}</p>}
      {loading && <Spinner animation="border" className="d-block mx-auto" />}

      {movies.length > 0 && (
        <Carousel className="mb-5" interval={5000}>
          {movies.slice(0, 5).map((movie, index) => (
            <Carousel.Item key={`${movie.id}-${index}`}>
              <img
                className="d-block w-100"
                src={
                  movie.poster_path
                    ? `https://image.tmdb.org/t/p/w1280${movie.poster_path}`
                    : 'https://via.placeholder.com/1280x500?text=No+Image'
                }
                alt={movie.title || 'Movie'}
              />
              <Carousel.Caption>
                <h3>{movie.title || 'Untitled'}</h3>
                <p>{movie.overview?.slice(0, 100) + '...' || 'No description available'}</p>
              </Carousel.Caption>
            </Carousel.Item>
          ))}
        </Carousel>
      )}

      <Row xs={1} md={3} lg={4} className="g-4">
        {movies.map((movie, index) => (
          <Col key={`${movie.id}-${index}`}>
            <Card className="movie-card">
              <Card.Img
                variant="top"
                src={
                  movie.poster_path
                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                    : 'https://via.placeholder.com/500x750?text=No+Image'
                }
                alt={movie.title || 'Movie'}
              />
              <Card.Body>
                <Card.Title>{movie.title || 'Untitled'}</Card.Title>
                <Card.Text>{movie.release_date?.slice(0, 4) || 'N/A'}</Card.Text>
                <button
                  className="btn btn-primary"
                  onClick={() => handleShowDetails(movie)}
                >
                  Xem chi tiết
                </button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {selectedMovie && (
        <Modal show={showDetails} onHide={handleCloseDetails} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>{selectedMovie.title || 'Untitled'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px' }}>
              <div style={{ flex: '0 0 auto' }}>
                <img
                  src={
                    selectedMovie.poster_path
                      ? `https://image.tmdb.org/t/p/w300${selectedMovie.poster_path}`
                      : 'https://via.placeholder.com/300x450?text=No+Image'
                  }
                  alt={selectedMovie.title || 'Movie'}
                  style={{ width: '300px', height: '450px', objectFit: 'cover' }}
                />
              </div>
              <div style={{ flex: '1' }}>
                <h4 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>
                  {selectedMovie.title || 'Untitled'}
                </h4>
                <p style={{ fontSize: '16px', marginBottom: '10px' }}>
                  <strong style={{ color: '#333' }}>Năm phát hành:</strong> {selectedMovie.release_date || 'N/A'}
                </p>
                <p style={{ fontSize: '16px', marginBottom: '15px' }}>
                  <strong style={{ color: '#333' }}>Mô tả phim:</strong> {selectedMovie.overview || 'No description available'}
                </p>
                {watchLinkAvailable ? (
                  <button
                    className="btn btn-watch-movie"
                    onClick={handleWatchMovie}
                  >
                    Xem phim
                  </button>
                ) : (
                  <p style={{ fontSize: '16px', color: '#dc3545', marginBottom: '15px' }}>
                    Link xem phim hiện không khả dụng.
                  </p>
                )}
                <div style={{ marginTop: '15px' }}>
                  <label style={{ fontSize: '16px', marginRight: '10px' }}>Đánh giá: </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(parseInt(e.target.value))}
                    style={{ padding: '5px', fontSize: '16px' }}
                  >
                    <option value={0}>Chọn đánh giá</option>
                    <option value={1}>1 sao</option>
                    <option value={2}>2 sao</option>
                    <option value={3}>3 sao</option>
                    <option value={4}>4 sao</option>
                    <option value={5}>5 sao</option>
                  </select>
                  <button
                    className="btn btn-primary"
                    onClick={handleSubmitRating}
                    style={{ marginLeft: '10px', fontSize: '16px' }}
                    disabled={rating === 0 || ratingSubmitted}
                  >
                    Gửi đánh giá
                  </button>
                  {ratingSubmitted && (
                    <p style={{ fontSize: '16px', color: '#28a745', marginTop: '10px' }}>
                      Đánh giá của bạn đã được gửi!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseDetails}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </Container>
  );
};

export default MovieRecommendations;
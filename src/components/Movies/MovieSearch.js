import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import { getAuth } from 'firebase/auth';

const MovieSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState('');

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [watchLinkAvailable, setWatchLinkAvailable] = useState(true);
  const [watchLink, setWatchLink] = useState('');
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm) return;

    try {
      const response = await axios.get(
        `https://api.themoviedb.org/3/search/movie?api_key=${process.env.REACT_APP_TMDB_API_KEY}&query=${searchTerm}`
      );
      setSearchResults(response.data.results);
      setError('');
    } catch (err) {
      setError('Failed to fetch movies. Please try again later.');
      console.error(err);
    }
  };

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
        `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${process.env.REACT_APP_TMDB_API_KEY}`
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
    <div className="container mt-4">
      <h2 className="mb-4">Tìm kiếm phim</h2>
      <div className="input-group mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Enter movie name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handleSearch}>Tìm kiếm</button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row">
        {searchResults.map((movie) => (
          <div className="col-md-4 mb-4" key={movie.id}>
            <div className="card h-100">
              <img
                src={
                  movie.poster_path
                    ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
                    : 'https://via.placeholder.com/300x450?text=No+Image'
                }
                className="card-img-top"
                alt={movie.title}
              />
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">{movie.title}</h5>
                <p className="card-text">{movie.release_date}</p>
                <button
                  className="btn btn-primary mt-auto"
                  onClick={() => handleShowDetails(movie)}
                >
                  Chi tiết
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedMovie && (
        <Modal show={showDetails} onHide={handleCloseDetails} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>{selectedMovie.title || 'Untitled'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '20px' }}>
              <img
                src={
                  selectedMovie.poster_path
                    ? `https://image.tmdb.org/t/p/w300${selectedMovie.poster_path}`
                    : 'https://via.placeholder.com/300x450?text=No+Image'
                }
                alt={selectedMovie.title || 'Movie'}
                style={{ width: '300px', height: '450px', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <h4>{selectedMovie.title}</h4>
                <p><strong>Release Year:</strong> {selectedMovie.release_date}</p>
                <p><strong>Overview:</strong> {selectedMovie.overview}</p>
                {watchLinkAvailable ? (
                  <button className="btn btn-success" onClick={handleWatchMovie}>Xem phim</button>
                ) : (
                  <p className="text-danger">Không có link xem phim.</p>
                )}
                <div className="mt-3">
                  <label>Đánh giá:</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(parseInt(e.target.value))}
                    className="form-select d-inline-block w-auto mx-2"
                  >
                    <option value={0}>Chọn sao</option>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <option key={val} value={val}>{val} sao</option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary"
                    onClick={handleSubmitRating}
                    disabled={rating === 0 || ratingSubmitted}
                  >
                    Gửi đánh giá
                  </button>
                  {ratingSubmitted && <p className="text-success mt-2">Đánh giá đã được gửi!</p>}
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
    </div>
  );
};

export default MovieSearch;

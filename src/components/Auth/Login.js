import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import '../../styles.css';

const Login = ({ setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser({ email: userCredential.user.email, role: 'user' });
      navigate('/');
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div>
      <div className="header-w3l">
        <h1>MovieApp Login</h1>
      </div>
      <div className="main-w3layouts-agileinfo">
        <div className="wthree-form">
          <h2>Fill out the form below to login</h2>
          <form onSubmit={handleLogin}>
            <div className="form-sub-w3">
              <input
                type="email"
                name="Email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="icon-w3">
                <i className="fa fa-user" aria-hidden="true"></i>
              </div>
            </div>
            <div className="form-sub-w3">
              <input
                type="password"
                name="Password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="icon-w3">
                <i className="fa fa-unlock-alt" aria-hidden="true"></i>
              </div>
            </div>
            {error && <p className="text-danger text-center">{error}</p>}
            <label className="anim">
              <input type="checkbox" className="checkbox" />
              <span>Remember Me</span>
              <a href="/register">Sign Up</a>
            </label>
            <div className="clear"></div>
            <div className="submit-agileits">
              <input type="submit" value="Login" />
            </div>
          </form>
        </div>
      </div>
      <div className="footer">
        <p>© 2025 MovieApp. All rights reserved</p>
      </div>
    </div>
  );
};

export default Login;
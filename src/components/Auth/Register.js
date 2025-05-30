import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import '../../styles.css';

const Register = ({ setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setUser({ email, role: 'user' });
      navigate('/');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div>
      <div className="header-w3l">
        <h1>MovieApp Register</h1>
      </div>
      <div className="main-w3layouts-agileinfo">
        <div className="wthree-form">
          <h2>Fill out the form below to register</h2>
          <form onSubmit={handleRegister}>
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
            <label className="anim">
              <input type="checkbox" className="checkbox" />
              <span>Agree to Terms</span>
              <a href="/login">Already have an account? Login</a>
            </label>
            <div className="clear"></div>
            <div className="submit-agileits">
              <input type="submit" value="Register" />
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

export default Register;
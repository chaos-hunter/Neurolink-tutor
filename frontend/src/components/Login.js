import React, { useState } from 'react';
import axios from 'axios';
import API_BASE from '../apiConfig';

const Login = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('student');
  const [adminCode, setAdminCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      if (isRegistering) {
        if (accountType === 'admin' && !adminCode.trim()) {
          setError('Please enter the admin access code.');
          return;
        }

        const response = await axios.post(`${API_BASE}/api/register`, {
          username,
          password,
          role: accountType,
          admin_code: adminCode
        });
        setSuccessMsg('Registration successful! Please log in.');
        setIsRegistering(false);
        setPassword('');
        setAdminCode('');
      } else {
        const response = await axios.post(`${API_BASE}/api/login`, {
          username,
          password
        });

        if (response.data.success) {
          onLogin(response.data.role, response.data.student_id, response.data.diagnostic_complete);
        }
      }
    } catch (err) {
      console.error('Login/Register error:', err);
      const apiError = err.response?.data?.error;
      const networkError = !err.response ? 'Network error: Backend might be offline or blocked by CORS.' : '';
      setError(apiError || networkError || 'An error occurred. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-left-panel">
        <div
          className="login-illustration"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <img
            src={isHovered ? "/logo-peeking.png.png" : "/logo-normal.png.png"}
            alt="Neuralinq Tutor Logo"
            className="logo-image"
          />
        </div>
        <div className="login-welcome-text">
          <h3>Welcome to Neuralinq Tutor</h3>
          <p>Your intelligent tutoring companion for personalized learning</p>
          <p className="logo-hint">💡 Psst... try hovering on the logo above!</p>
        </div>
      </div>

      <div className="login-right-panel">
        <div className="login-form-box">
          <h2>{isRegistering ? 'Create Account' : 'Sign In'}</h2>
          <p>{isRegistering ? 'Join us to start learning!' : 'Enter your credentials to access your learning dashboard'}</p>

          {error && <div className="alert alert-danger" style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
          {successMsg && <div className="alert alert-success" style={{ color: 'green', marginBottom: '10px' }}>{successMsg}</div>}

          <form id="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>

            {isRegistering && (
              <div className="input-group">
                <label>Account Type</label>
                <div className="account-type-options">
                  <label style={{ marginRight: '15px' }}>
                    <input
                      type="radio"
                      name="accountType"
                      value="student"
                      checked={accountType === 'student'}
                      onChange={(e) => setAccountType(e.target.value)}
                    />
                    <span style={{ marginLeft: '6px' }}>Student</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="accountType"
                      value="admin"
                      checked={accountType === 'admin'}
                      onChange={(e) => setAccountType(e.target.value)}
                    />
                    <span style={{ marginLeft: '6px' }}>Admin</span>
                  </label>
                </div>
                <small style={{ color: '#555' }}>
                  Admin accounts require the special access code.
                </small>
              </div>
            )}

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.2em'
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {isRegistering && accountType === 'admin' && (
              <div className="input-group">
                <label htmlFor="adminCode">Admin Access Code</label>
                <input
                  type="password"
                  id="adminCode"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="Enter the special admin code"
                  required={accountType === 'admin'}
                />
              </div>
            )}

            <button type="submit" className="btn btn-primary">
              {isRegistering ? 'Register' : 'Sign In'}
            </button>

            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              <button
                type="button"
                className="btn-link"
                style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                  setSuccessMsg('');
                  setAdminCode('');
                  setAccountType('student');
                }}
              >
                {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

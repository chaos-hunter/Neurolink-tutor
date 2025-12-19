import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../apiConfig';

const Settings = ({ onLogout, darkMode, toggleDarkMode, userRole, studentId }) => {
  const [studentData, setStudentData] = useState({
    name: 'Alex Smith',
    email: 'student@test.com',
    language_prefs: {
      learn: 'english',
      ui: 'english'
    }
  });
  const [feedback, setFeedback] = useState('');
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const showFeedback = (message, isError = false) => {
    setFeedback({ message, isError });
    setTimeout(() => setFeedback(''), 3000);
  };

  const loadStudentData = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/student-data?student_id=${studentId}`);
      const data = {
        name: response.data.name,
        email: response.data.email,
        language_prefs: response.data.language_prefs
      };
      setStudentData(data);
    } catch (error) {
      console.error('Error loading student data:', error);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${API_BASE}/api/update-profile`, {
        student_id: studentId,
        name: studentData.name,
        email: studentData.email
      });

      showFeedback(response.data.message);
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Error updating profile', true);
    }
  };

  const handleLanguageSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${API_BASE}/api/update-language`, {
        student_id: studentId,
        learn_lang: studentData.language_prefs.learn,
        ui_lang: studentData.language_prefs.ui
      });

      showFeedback(response.data.message);
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Error updating language preferences', true);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      showFeedback('Passwords do not match!', true);
      return;
    }

    if (passwords.newPassword.length < 8) {
      showFeedback('Password must be at least 8 characters', true);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/api/update-password`, {
        student_id: studentId,
        password: passwords.newPassword
      });

      showFeedback(response.data.message);
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Error updating password', true);
    }
  };

  const handleResetProgress = async () => {
    if (!window.confirm('Are you sure you want to reset ALL your progress? This will delete all your badges, metrics, and mastery scores. This action cannot be undone!')) {
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/reset-progress`, {
        student_id: studentId
      });

      showFeedback('Progress reset successfully! You can start fresh now.');

      // Reload student data to show the reset
      setTimeout(() => {
        loadStudentData();
      }, 1000);
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Error resetting progress', true);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      onLogout();
    }
  };

  useEffect(() => {
    loadStudentData();
  }, []);

  const handleDeleteAccount = async () => {
    // Play "Danger Zone" audio
    try {
      const audio = new Audio('https://archive.org/download/top-gun-original-motion-picture-soundtrack/01%20Danger%20Zone.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio play blocked or failed:", e));
    } catch (e) {
      console.error("Error playing audio:", e);
    }

    if (!window.confirm('⚠️ WARNING: This will permanently delete your account and all your progress. This action CANNOT be undone. Are you sure?')) {
      return;
    }

    if (!window.confirm('FINAL CONFIRMATION: Are you absolutely sure you want to delete your account?')) {
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/user/delete-account`, {
        student_id: studentId
      });

      alert('Your account has been deleted successfully.');
      onLogout(); // Log the user out since their account no longer exists
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Error deleting account', true);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <Link to="/lesson" className="logo-link">
          <h1>Settings</h1>
        </Link>
        <div>
          <Link to="/lesson" className="header-link">Back to Lesson</Link>
          {userRole === 'admin' && (
            <Link to="/admin" className="header-link admin-link">🔧 Admin Panel</Link>
          )}
        </div>
      </header>

      <div className="settings-content">
        <div className="settings-card">
          <h2>Profile</h2>
          <form onSubmit={handleProfileSubmit}>
            <div className="input-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                value={studentData.name}
                onChange={(e) => setStudentData({ ...studentData, name: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={studentData.email}
                onChange={(e) => setStudentData({ ...studentData, email: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary">Save Profile</button>
          </form>
        </div>

        <div className="settings-card">
          <h2>Language</h2>
          <p>This addresses our paper prototype feedback.</p>
          <form onSubmit={handleLanguageSubmit}>
            <div className="input-group">
              <label htmlFor="learn-lang">Language I want to learn</label>
              <select
                id="learn-lang"
                value={studentData.language_prefs.learn}
                onChange={(e) => setStudentData({
                  ...studentData,
                  language_prefs: { ...studentData.language_prefs, learn: e.target.value }
                })}
              >
                <option value="english">English</option>
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="ui-lang">Language I understand (for instructions)</label>
              <select
                id="ui-lang"
                value={studentData.language_prefs.ui}
                onChange={(e) => setStudentData({
                  ...studentData,
                  language_prefs: { ...studentData.language_prefs, ui: e.target.value }
                })}
              >
                <option value="english">English</option>
                <option value="spanish">Spanish</option>
                <option value="french">French</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Save Languages</button>
          </form>
        </div>

        <div className="settings-card">
          <h2>Security</h2>
          <form onSubmit={handlePasswordSubmit}>
            <div className="input-group">
              <label htmlFor="new-password">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="new-password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="Min 8 characters"
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
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
                  title={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirm-password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Change Password</button>
          </form>
        </div>

        <div className="settings-card">
          <h2>Progress Management</h2>
          <p>Reset your learning progress to start fresh.</p>
          <button
            onClick={handleResetProgress}
            className="btn btn-warning"
            style={{ marginRight: '10px' }}
          >
            Reset My Progress
          </button>
          <small style={{ display: 'block', marginTop: '10px', color: '#666' }}>
            This will clear all your progress, badges, and metrics. This action cannot be undone.
          </small>
        </div>

        <div className="settings-card danger-zone" style={{ border: '1px solid #ff3b30', background: 'rgba(255, 59, 48, 0.05)' }}>
          <h2 style={{ color: '#ff3b30' }}>Danger Zone</h2>
          <p>Permanently delete your account and all associated data.</p>
          <button onClick={handleDeleteAccount} className="btn btn-danger">Delete My Account</button>
        </div>

        <div className="settings-card">
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%' }}>Log Out</button>
        </div>

        {feedback && (
          <div id="settings-feedback">
            <div className={`feedback-box ${feedback.isError ? 'incorrect' : 'correct'}`}>
              {feedback.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;

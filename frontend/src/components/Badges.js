import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../apiConfig';

const Badges = ({ onLogout, userRole, studentId }) => {
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [availableBadges, setAvailableBadges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const activeStudentId = studentId || 'student_alex';

  useEffect(() => {
    fetchBadges();
  }, [studentId]);

  const fetchBadges = async () => {
    try {
      const response = await axios.post(`${API_BASE}/api/get-badges`, {
        student_id: activeStudentId
      });
      setEarnedBadges(response.data.earned_badges);
      setAvailableBadges(response.data.available_badges);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <Link to="/lesson" className="logo-link">
            <h1>My Badges</h1>
          </Link>
          {userRole === 'admin' && <span className="role-badge">Admin Mode</span>}
        </div>
        <div>
          <Link to="/lesson" className="header-link">📚 Lessons</Link>
          <Link to="/profile" className="header-link">📊 Progress</Link>
          <Link to="/metrics" className="header-link">📈 Metrics</Link>
          <Link to="/settings" className="header-link settings-icon">⚙️</Link>
          {userRole === 'admin' && (
            <Link to="/admin" className="header-link admin-link">🔧 Admin Panel</Link>
          )}
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to log out?')) {
                onLogout();
              }
            }}
            className="header-link logout-btn"
          >
            🚪 Logout
          </button>
        </div>
      </header>

      <div className="badges-content">
        {isLoading ? (
          <div className="loading">Loading your badges...</div>
        ) : (
          <>
            <section className="earned-badges">
              <h2>🏆 Your Achievements ({earnedBadges.length})</h2>
              {earnedBadges.length === 0 ? (
                <div className="no-badges">
                  <p>No badges earned yet. Keep learning to unlock your first achievement!</p>
                  <Link to="/lesson" className="btn btn-primary">Start Learning</Link>
                </div>
              ) : (
                <div className="badges-grid">
                  {earnedBadges.map((badge, index) => (
                    <div key={index} className="badge-card earned">
                      <div className="badge-icon">{badge.icon}</div>
                      <h3>{badge.name}</h3>
                      <p>{badge.description}</p>
                      <small>Earned: {badge.earned_date}</small>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="available-badges">
              <h2>🎯 Available Badges ({availableBadges.length})</h2>
              <div className="badges-grid">
                {availableBadges.map((badge, index) => (
                  <div key={index} className="badge-card available">
                    <div className="badge-icon locked">{badge.icon}</div>
                    <h3>{badge.name}</h3>
                    <p>{badge.description}</p>
                    <small>Not earned yet</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="badge-tips">
              <h2>💡 How to Earn Badges</h2>
              <div className="tips-grid">
                <div className="tip-card">
                  <h4>🌟 First Steps</h4>
                  <p>Complete your first lesson to get started!</p>
                </div>
                <div className="tip-card">
                  <h4>⚡ Speed Demon</h4>
                  <p>Answer questions quickly (under 15 seconds average)</p>
                </div>
                <div className="tip-card">
                  <h4>🏆 Skill Masters</h4>
                  <p>Master all questions in a skill area (100% mastery)</p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Badges;
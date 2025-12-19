import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../apiConfig';

const Metrics = ({ onLogout, userRole, studentId }) => {
  const [metrics, setMetrics] = useState({});
  const [mastery, setMastery] = useState({});
  const [recommendedSkills, setRecommendedSkills] = useState([]);
  const [level, setLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const activeStudentId = studentId || 'student_alex';

  useEffect(() => {
    fetchMetrics();
  }, [studentId]);

  const fetchMetrics = async () => {
    try {
      const response = await axios.post(`${API_BASE}/api/get-metrics`, {
        student_id: activeStudentId
      });
      setMetrics(response.data.metrics);
      setMastery(response.data.mastery);
      setRecommendedSkills(response.data.recommended_skills);
      setLevel(response.data.level);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSkillName = (skill) => {
    return skill.replace('_', ' ').toUpperCase();
  };

  const getPerformanceColor = (accuracy) => {
    if (accuracy >= 0.8) return '#4CAF50'; // Green
    if (accuracy >= 0.6) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const calculateAccuracy = (correct, total) => {
    return total > 0 ? (correct / total) : 0;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <Link to="/lesson" className="logo-link">
            <h1>Performance Metrics</h1>
          </Link>
          {userRole === 'admin' && <span className="role-badge">Admin Mode</span>}
        </div>
        <div>
          <Link to="/lesson" className="header-link">📚 Lessons</Link>
          <Link to="/profile" className="header-link">📊 Progress</Link>
          <Link to="/badges" className="header-link">🏆 Badges</Link>
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

      <div className="metrics-content">
        {isLoading ? (
          <div className="loading">Loading your metrics...</div>
        ) : (
          <>
            <section className="overview-stats">
              <h2>📊 Overall Performance</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>{metrics.total_questions_answered || 0}</h3>
                  <p>Total Questions</p>
                </div>
                <div className="stat-card">
                  <h3>{metrics.correct_answers || 0}</h3>
                  <p>Correct Answers</p>
                </div>
                <div className="stat-card">
                  <h3>{Math.round(((metrics.correct_answers || 0) / Math.max(metrics.total_questions_answered || 1, 1)) * 100)}%</h3>
                  <p>Overall Accuracy</p>
                </div>
                <div className="stat-card">
                  <h3>{Math.round(metrics.average_time_per_question || 0)}s</h3>
                  <p>Avg. Time per Question</p>
                </div>
              </div>
            </section>

            <section className="skill-performance">
              <h2>🎯 Skill Breakdown</h2>
              <div className="skills-grid">
                {Object.entries(metrics.skill_performance || {}).map(([skill, performance]) => {
                  const accuracy = calculateAccuracy(performance.correct, performance.questions_answered);
                  const masteryScore = mastery[skill] || 0;

                  return (
                    <div key={skill} className="skill-card">
                      <h3>{formatSkillName(skill)}</h3>
                      <div className="skill-stats">
                        <div className="stat-row">
                          <span>Questions Answered:</span>
                          <span>{performance.questions_answered}</span>
                        </div>
                        <div className="stat-row">
                          <span>Accuracy:</span>
                          <span style={{ color: getPerformanceColor(accuracy) }}>
                            {Math.round(accuracy * 100)}%
                          </span>
                        </div>
                        <div className="stat-row">
                          <span>Avg. Time:</span>
                          <span>{Math.round(performance.average_time)}s</span>
                        </div>
                        <div className="stat-row">
                          <span>Mastery:</span>
                          <span>{Math.round(masteryScore * 100)}%</span>
                        </div>
                        <div className="mastery-bar">
                          <div
                            className="mastery-fill"
                            style={{
                              width: `${masteryScore * 100}%`,
                              backgroundColor: masteryScore >= 1.0 ? '#4CAF50' : '#2196F3'
                            }}
                          ></div>
                        </div>
                        {performance.struggling_areas && performance.struggling_areas.length > 0 && (
                          <div className="struggling-areas">
                            <small>Struggling with: {performance.struggling_areas.join(', ')}</small>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="recommendations">
              <h2>💡 Your Recommended Question Set (Level {level})</h2>
              {recommendedSkills.length > 0 ? (
                <div className="recommendations-content">
                  <p>Based on your performance, we recommend focusing on these skills:</p>
                  <div className="recommended-skills">
                    {recommendedSkills.map((skill, index) => (
                      <div key={index} className="recommended-skill">
                        <span className="skill-name">{formatSkillName(skill)}</span>
                        <span className="skill-reason">Needs improvement</span>
                      </div>
                    ))}
                  </div>
                  <Link to="/lesson" className="btn btn-primary">
                    Practice Recommended Skills
                  </Link>
                </div>
              ) : (
                <div className="no-recommendations">
                  <p>Great job! You're performing well in all areas. Keep practicing to maintain your skills!</p>
                  <Link to="/lesson" className="btn btn-primary">Continue Learning</Link>
                </div>
              )}
            </section>

            <section className="time-analysis">
              <h2>⏱️ Time Analysis</h2>
              <div className="time-stats">
                <div className="time-card">
                  <h4>Speed Performance</h4>
                  <p>
                    {metrics.average_time_per_question < 15
                      ? "🚀 You're a speed demon! Great quick thinking."
                      : metrics.average_time_per_question < 30
                        ? "⚡ Good pace! You're answering at a steady speed."
                        : "🐢 Take your time, but try to be a bit quicker."}
                  </p>
                </div>
                <div className="time-card">
                  <h4>Recommendation</h4>
                  <p>
                    {metrics.average_time_per_question > 30
                      ? "Try to answer more quickly to improve your speed badge progress."
                      : "Keep up the good work with your response time!"}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Metrics;
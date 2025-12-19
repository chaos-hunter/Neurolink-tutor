import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../apiConfig';

const Results = ({ onLogout, userRole, studentId }) => {
  const [questionHistory, setQuestionHistory] = useState([]);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recent');
  const [retryQuestion, setRetryQuestion] = useState(null);

  const activeStudentId = studentId || 'student_alex';

  useEffect(() => {
    fetchQuestionHistory();
    fetchSessionSummary();
  }, [studentId]);

  const fetchQuestionHistory = async () => {
    try {
      const response = await axios.post(`${API_BASE}/api/get-question-history`, {
        student_id: activeStudentId,
        limit: 20
      });
      setQuestionHistory(response.data.history);
    } catch (error) {
      console.error('Error fetching question history:', error);
    }
  };

  const fetchSessionSummary = async () => {
    try {
      const response = await axios.post(`${API_BASE}/api/get-session-summary`, {
        student_id: activeStudentId,
        session_size: 10
      });
      setSessionSummary(response.data.session_summary);
    } catch (error) {
      console.error('Error fetching session summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryQuestion = async (questionId) => {
    try {
      const response = await axios.post(`${API_BASE}/api/retry-question`, {
        question_id: questionId
      });
      setRetryQuestion(response.data);
    } catch (error) {
      console.error('Error fetching retry question:', error);
    }
  };

  const formatSkillName = (skill) => {
    return skill.replace('_', ' ').toUpperCase();
  };

  const formatTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 80) return '#4CAF50';
    if (accuracy >= 60) return '#FF9800';
    return '#F44336';
  };

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="results-content">
          <div className="loading">Loading your results...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <Link to="/lesson" className="logo-link">
            <h1>Question Results</h1>
          </Link>
          {userRole === 'admin' && <span className="role-badge">Admin Mode</span>}
        </div>
        <div>
          <Link to="/lesson" className="header-link">📚 Lessons</Link>
          <Link to="/profile" className="header-link">📊 Progress</Link>
          <Link to="/badges" className="header-link">🏆 Badges</Link>
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

      <div className="results-content">
        {sessionSummary && (
          <section className="session-overview">
            <h2>📊 Recent Session Summary</h2>
            <div className="summary-cards">
              <div className="summary-card">
                <div className="summary-number">{sessionSummary.total_questions}</div>
                <div className="summary-label">Questions Attempted</div>
              </div>
              <div className="summary-card">
                <div className="summary-number" style={{ color: getAccuracyColor(sessionSummary.accuracy) }}>
                  {sessionSummary.accuracy}%
                </div>
                <div className="summary-label">Accuracy</div>
              </div>
              <div className="summary-card">
                <div className="summary-number">{formatTime(sessionSummary.average_time)}</div>
                <div className="summary-label">Avg. Time</div>
              </div>
              <div className="summary-card">
                <div className="summary-number">{sessionSummary.total_hints_used}</div>
                <div className="summary-label">Hints Used</div>
              </div>
            </div>
            <div className="skills-practiced">
              <h4>Skills Practiced:</h4>
              <div className="skill-tags">
                {sessionSummary.skills_practiced.map((skill, index) => (
                  <span key={index} className="skill-tag">
                    {formatSkillName(skill)}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="question-history">
          <h2>📝 Detailed Question Review</h2>

          <div className="results-tabs">
            <button
              className={`tab-button ${activeTab === 'recent' ? 'active' : ''}`}
              onClick={() => setActiveTab('recent')}
            >
              Recent Questions
            </button>
            <button
              className={`tab-button ${activeTab === 'incorrect' ? 'active' : ''}`}
              onClick={() => setActiveTab('incorrect')}
            >
              Incorrect Only
            </button>
          </div>

          <div className="questions-list">
            {questionHistory
              .filter(q => activeTab === 'recent' || !q.is_correct)
              .map((question, index) => (
                <div key={index} className={`question-result-card ${question.is_correct ? 'correct' : 'incorrect'}`}>
                  <div className="question-header">
                    <div className="question-status">
                      <span className={`status-icon ${question.is_correct ? 'correct' : 'incorrect'}`}>
                        {question.is_correct ? '✅' : '❌'}
                      </span>
                      <span className="skill-badge">{formatSkillName(question.skill)}</span>
                    </div>
                    <div className="question-stats">
                      <span className="time-stat">⏱️ {formatTime(question.time_spent)}</span>
                      {question.hints_used > 0 && (
                        <span className="hints-stat">💡 {question.hints_used} hints</span>
                      )}
                    </div>
                  </div>

                  <div className="question-content">
                    <p className="question-text">{question.question_text}</p>
                    <p className="correct-answer">
                      <strong>Correct Answer:</strong> {question.correct_answer}
                    </p>
                  </div>

                  {!question.is_correct && (
                    <div className="question-actions">
                      <button
                        className="btn btn-retry"
                        onClick={() => handleRetryQuestion(question.question_id)}
                      >
                        🔄 Retry This Question
                      </button>
                    </div>
                  )}

                  <div className="question-timestamp">
                    <small>Answered: {question.timestamp}</small>
                  </div>
                </div>
              ))}
          </div>

          {questionHistory.filter(q => activeTab === 'recent' || !q.is_correct).length === 0 && (
            <div className="no-results">
              <p>
                {activeTab === 'recent'
                  ? "No questions answered yet. Start learning to see your results here!"
                  : "Great job! No incorrect answers to review."}
              </p>
              <Link to="/lesson" className="btn btn-primary">Start Learning</Link>
            </div>
          )}
        </section>
      </div>

      {/* Retry Question Modal */}
      {retryQuestion && (
        <div className="modal-overlay" onClick={() => setRetryQuestion(null)}>
          <div className="retry-modal" onClick={(e) => e.stopPropagation()}>
            <h3>🔄 Retry Question</h3>
            <div className="retry-question-content">
              <p><strong>Skill:</strong> {formatSkillName(retryQuestion.skill)}</p>
              <p><strong>Question:</strong> {retryQuestion.question}</p>
              <p><strong>Correct Answer:</strong> {retryQuestion.answer}</p>
            </div>
            <div className="retry-actions">
              <Link
                to="/lesson"
                className="btn btn-primary"
                onClick={() => setRetryQuestion(null)}
              >
                Practice Similar Questions
              </Link>
              <button
                className="btn btn-secondary"
                onClick={() => setRetryQuestion(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;
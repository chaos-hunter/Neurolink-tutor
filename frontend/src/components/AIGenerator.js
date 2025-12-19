import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API_BASE from '../apiConfig';
import './AIGenerator.css';

function AIGenerator({ studentId, onLogout }) {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [questionCount, setQuestionCount] = useState(5);
  const [generationType, setGenerationType] = useState('lesson');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [allSkillLessons, setAllSkillLessons] = useState([]);
  const [selectedLessonId, setSelectedLessonId] = useState('');

  useEffect(() => {
    checkAIStatus();
    fetchSkills();
    fetchStudents();
    fetchSkillLessons();
  }, []);

  const checkAIStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ai/status`);
      const data = await response.json();
      setAiEnabled(data.ai_enabled);
      if (!data.ai_enabled) {
        setError('AI features are not enabled. Please configure GEMINI_API_KEY in backend/.env');
      }
    } catch (err) {
      setError('Failed to check AI status');
    }
  };

  const fetchSkills = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/skills`);
      const data = await response.json();
      console.log('Fetched skills:', data);
      setSkills(data);
      if (data.length > 0) {
        setSelectedSkill(data[0]);
        console.log('Selected skill:', data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch skills:', err);
      setError('Failed to load skills. Please refresh the page.');
    }
  };

  const fetchSkillLessons = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/skill-lessons`);
      const data = await response.json();
      setAllSkillLessons(data);
    } catch (err) {
      console.error('Failed to fetch skill lessons:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/users`);
      const data = await response.json();
      console.log('Fetched users:', data);
      const studentList = data.filter(user => user.role === 'student');
      console.log('Student list:', studentList);
      setStudents(studentList);
      if (studentList.length > 0) {
        setSelectedStudent(studentList[0].username);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
      setError('Failed to load students. Please check console.');
    }
  };

  const handleGenerateLesson = async () => {
    if (!selectedSkill) {
      setError('Please select a skill');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/ai/generate-lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill: selectedSkill,
          difficulty: difficulty,
          student_id: studentId
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          type: 'lesson',
          data: data.lesson
        });
      } else {
        setError(data.error || 'Failed to generate lesson');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!selectedSkill) {
      setError('Please select a skill');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/ai/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill: selectedSkill,
          difficulty: difficulty,
          count: questionCount,
          lesson_id: selectedLessonId || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          type: 'questions',
          data: data.questions
        });
      } else {
        setError(data.error || 'Failed to generate questions');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalizedPractice = async () => {
    // Use selectedStudent if available (admin mode), otherwise use studentId (student mode)
    const targetStudent = selectedStudent || studentId;

    if (!selectedSkill || !targetStudent) {
      setError('Please select a skill and a student');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/ai/personalized-practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: targetStudent,
          skill: selectedSkill,
          count: questionCount
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          type: 'personalized',
          data: data.practice
        });
      } else {
        setError(data.error || 'Failed to generate personalized practice');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    switch (generationType) {
      case 'lesson':
        handleGenerateLesson();
        break;
      case 'questions':
        handleGenerateQuestions();
        break;
      case 'personalized':
        handlePersonalizedPractice();
        break;
      default:
        break;
    }
  };

  if (!aiEnabled) {
    return (
      <div className="ai-generator">
        <div className="ai-disabled">
          <h2>🤖 AI Generator</h2>
          <p className="error-message">{error}</p>
          <div className="setup-instructions">
            <h3>Setup Instructions:</h3>
            <ol>
              <li>Get a Gemini API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
              <li>Add it to <code>backend/.env</code>: <code>GEMINI_API_KEY=your-key-here</code></li>
              <li>Restart the backend server</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <Link to="/admin" className="logo-link">
          <h1>🤖 AI Generator</h1>
        </Link>
        <div className="header-right">
          <Link to="/admin" className="header-link">← Back to Admin</Link>
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

      <div className="ai-generator">
        <div className="ai-header">
          <h2>🤖 AI Content Generator</h2>
          <p>Generate personalized lessons and questions using Google Gemini AI</p>
        </div>

        <div className="ai-controls">
          <div className="form-group">
            <label>Generation Type:</label>
            <select value={generationType} onChange={(e) => setGenerationType(e.target.value)}>
              <option value="lesson">Complete Lesson</option>
              <option value="questions">Questions Only</option>
              <option value="personalized">Personalized Practice</option>
            </select>
          </div>

          <div className="form-group">
            <label>Skill:</label>
            <select
              value={selectedSkill}
              onChange={(e) => {
                setSelectedSkill(e.target.value);
                setSelectedLessonId(''); // Reset lesson when skill changes
              }}
            >
              {skills.length === 0 && <option value="">Loading skills...</option>}
              {skills.map(skill => (
                <option key={skill} value={skill}>{skill.replace('_', ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>

          {generationType !== 'questions' && (
            <div className="form-group">
              <label>Difficulty:</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          )}

          {generationType === 'questions' && (
            <div className="form-group">
              <label>Lesson:</label>
              <select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
              >
                <option value="">-- Select a Lesson --</option>
                {allSkillLessons
                  .find(s => s.skill === selectedSkill)
                  ?.lessons.map(lesson => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))
                }
              </select>
            </div>
          )}

          {generationType === 'personalized' && (
            <div className="form-group">
              <label>Select Student:</label>
              <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
                {students.length === 0 && <option value="">Loading students...</option>}
                {students.map(student => (
                  <option key={student.username} value={student.username}>
                    {student.name} ({student.username})
                  </option>
                ))}
              </select>
              <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                Generate personalized content based on this student's performance
              </small>
            </div>
          )}

          {(generationType === 'questions' || generationType === 'personalized') && (
            <div className="form-group">
              <label>Number of Questions:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              />
            </div>
          )}

          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? '⏳ Generating...' : '✨ Generate'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {result && (
          <div className="ai-result">
            {result.type === 'lesson' && (
              <div className="lesson-result">
                <h3>✅ Lesson Generated!</h3>
                <div className="lesson-card">
                  <h4>{result.data.title}</h4>
                  <p className="description">{result.data.description}</p>

                  {result.data.learning_objectives && (
                    <div className="objectives">
                      <strong>Learning Objectives:</strong>
                      <ul>
                        {result.data.learning_objectives.map((obj, i) => (
                          <li key={i}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.data.key_concepts && (
                    <div className="concepts">
                      <strong>Key Concepts:</strong>
                      <ul>
                        {result.data.key_concepts.map((concept, i) => (
                          <li key={i}>{concept}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="content">
                    <strong>Content:</strong>
                    <div className="content-text">{result.data.content}</div>
                  </div>
                </div>
              </div>
            )}

            {result.type === 'questions' && (
              <div className="questions-result">
                <h3>✅ {result.data.length} Questions Generated!</h3>
                {result.data.map((q, i) => (
                  <div key={i} className="question-card">
                    <h4>Question {i + 1}</h4>
                    <p><strong>Q:</strong> {q.question}</p>
                    <p><strong>A:</strong> {q.answer}</p>
                    <p><strong>Type:</strong> {q.type}</p>
                    {q.hints && (
                      <details>
                        <summary>Hints ({q.hints.length})</summary>
                        <ul>
                          {q.hints.map((hint, j) => (
                            <li key={j}>{hint}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}

            {result.type === 'personalized' && (
              <div className="personalized-result">
                <h3>✅ Personalized Practice Generated!</h3>
                <div className="practice-info">
                  <h4>{result.data.practice_title}</h4>
                  <p><strong>Difficulty:</strong> {result.data.difficulty}</p>
                  {result.data.focus_areas && (
                    <p><strong>Focus Areas:</strong> {result.data.focus_areas.join(', ')}</p>
                  )}
                </div>
                {result.data.questions && result.data.questions.map((q, i) => (
                  <div key={i} className="question-card">
                    <h4>Question {i + 1}</h4>
                    <p><strong>Q:</strong> {q.question}</p>
                    <p><strong>A:</strong> {q.answer}</p>
                    {q.hints && (
                      <details>
                        <summary>Hints</summary>
                        <ul>
                          {q.hints.map((hint, j) => (
                            <li key={j}>{hint}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AIGenerator;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../apiConfig';

const Admin = ({ onLogout, userRole }) => {
  const isAdmin = userRole === 'admin';
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    skill: 'vocabulary',
    lesson: ''
  });
  const [feedback, setFeedback] = useState('');
  const [allQuestions, setAllQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState('add');
  const [isLoading, setIsLoading] = useState(false);
  const [skills, setSkills] = useState([]);
  const [skillLessons, setSkillLessons] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [newLesson, setNewLesson] = useState({ skill: 'vocabulary', title: '', description: '' });
  const [users, setUsers] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // Image management state
  const [imageSearch, setImageSearch] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePosition, setImagePosition] = useState('header');

  // Badge creation state
  const [badgeForm, setBadgeForm] = useState({
    badge_id: '',
    name: '',
    description: '',
    icon: '🏆',
    criteria_type: 'accuracy',
    criteria_value: 80
  });

  useEffect(() => {
    if (!isAdmin) return;
    fetchSkills();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'manage') {
      fetchAllQuestions();
    }

    if (activeTab === 'users') {
      fetchAllUsers();
    }

    if (activeTab === 'skills') {
      fetchSkills();
    }
  }, [activeTab, isAdmin]);

  const showFeedback = (message, isError = false) => {
    setFeedback({ message, isError });
    setTimeout(() => setFeedback(''), 3000);
  };

  const fetchSkills = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/skill-lessons`);
      setSkillLessons(response.data);
      const skillNames = response.data.map((item) => item.skill);
      setSkills(skillNames);

      const defaultSkill = (formData.skill && skillNames.includes(formData.skill)) ? formData.skill : skillNames[0] || 'vocabulary';
      const lessonsForSkill = response.data.find((item) => item.skill === defaultSkill)?.lessons || [];
      setFormData(prev => ({
        ...prev,
        skill: defaultSkill,
        lesson: prev.lesson && lessonsForSkill.some(l => l.id === prev.lesson)
          ? prev.lesson
          : (lessonsForSkill[0]?.id || '')
      }));
      setNewLesson(prev => ({
        ...prev,
        skill: prev.skill || defaultSkill
      }));
    } catch (error) {
      showFeedback('Error loading skills', true);
    }
  };

  const fetchAllQuestions = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/get-all-questions`);
      setAllQuestions(response.data);
    } catch (error) {
      showFeedback('Error loading questions', true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    setIsUsersLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/admin/users`);
      setUsers(response.data);
    } catch (error) {
      showFeedback('Error loading users', true);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const getLessonsForSkill = (skillKey) => {
    return skillLessons.find((item) => item.skill === skillKey)?.lessons || [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.question.trim() || !formData.answer.trim()) {
      showFeedback('Please fill in all fields', true);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/api/add-question`, formData);

      showFeedback('Question added successfully!');
      const lessonsForSkill = getLessonsForSkill(formData.skill);
      setFormData({
        question: '',
        answer: '',
        skill: formData.skill || skills[0] || 'vocabulary',
        lesson: lessonsForSkill[0]?.id || ''
      });
      if (activeTab === 'manage') {
        fetchAllQuestions(); // Refresh the list
      }
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Error adding question', true);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'skill') {
      const lessonsForSkill = getLessonsForSkill(value);
      setFormData(prev => ({
        ...prev,
        skill: value,
        lesson: lessonsForSkill[0]?.id || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();

    if (!newSkill.trim()) {
      showFeedback('Please enter a skill name', true);
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/admin/add-skill`, { skill: newSkill });
      showFeedback('Skill added successfully!');
      setNewSkill('');
      fetchSkills();
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Error adding skill', true);
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();

    if (!newLesson.skill || !newLesson.title.trim()) {
      showFeedback('Please choose a skill and enter a lesson title', true);
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/admin/add-lesson`, {
        skill: newLesson.skill,
        title: newLesson.title,
        description: newLesson.description
      });
      showFeedback('Lesson added successfully!');
      setNewLesson(prev => ({ ...prev, title: '', description: '' }));
      fetchSkills();
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Error adding lesson', true);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/delete-question`, {
        question_id: questionId
      });
      showFeedback('Question deleted successfully!');
      fetchAllQuestions(); // Refresh the list
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Error deleting question', true);
    }
  };

  const handleDeleteUser = async (username) => {
    if (!window.confirm(`Delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/admin/delete-user`, {
        username
      });
      showFeedback('User deleted successfully');
      fetchAllUsers();
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Error deleting user', true);
    }
  };

  const handleDeleteSkill = async (skill) => {
    if (!window.confirm(`Delete entire skill "${skill.replace(/_/g, ' ')}" and ALL its content? This cannot be undone.`)) {
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/admin/delete-skill`, { skill });
      showFeedback('Skill deleted successfully');
      fetchSkills();
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Error deleting skill', true);
    }
  };

  const handleDeleteLesson = async (skill, lessonId, lessonTitle) => {
    if (!window.confirm(`Delete lesson "${lessonTitle}"? Associated questions will also be removed.`)) {
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/admin/delete-lesson`, { skill, lesson_id: lessonId });
      showFeedback('Lesson deleted successfully');
      fetchSkills();
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Error deleting lesson', true);
    }
  };

  const handleAddImageToLesson = async (e) => {
    e.preventDefault();

    if (!selectedLesson || !imageUrl) {
      showFeedback('Please select a lesson and provide an image URL', true);
      return;
    }

    try {
      const [skill, lessonId] = selectedLesson.split('|');
      await axios.post(`${API_BASE}/api/admin/update-lesson-image`, {
        skill,
        lesson_id: lessonId,
        image_url: imageUrl,
        position: imagePosition
      });
      showFeedback('Image added to lesson successfully!');
      setImageUrl('');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Error adding image', true);
    }
  };

  const handleAddImageToQuestion = async (e) => {
    e.preventDefault();

    if (!selectedQuestion || !imageUrl) {
      showFeedback('Please select a question and provide an image URL', true);
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/admin/update-question-image`, {
        question_id: parseInt(selectedQuestion),
        image_url: imageUrl
      });
      showFeedback('Image added to question successfully!');
      setImageUrl('');
      if (activeTab === 'manage') {
        fetchAllQuestions();
      }
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Error adding image', true);
    }
  };

  const handleCreateBadge = async (e) => {
    e.preventDefault();

    if (!badgeForm.badge_id || !badgeForm.name || !badgeForm.description) {
      showFeedback('Please fill in all badge fields', true);
      return;
    }

    try {
      const criteria = {
        type: badgeForm.criteria_type,
        value: badgeForm.criteria_value
      };

      await axios.post(`${API_BASE}/api/admin/create-badge`, {
        badge_id: badgeForm.badge_id,
        name: badgeForm.name,
        description: badgeForm.description,
        icon: badgeForm.icon,
        criteria
      });

      showFeedback('Badge created successfully!');
      setBadgeForm({
        badge_id: '',
        name: '',
        description: '',
        icon: '🏆',
        criteria_type: 'accuracy',
        criteria_value: 80
      });
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Error creating badge', true);
    }
  };

  if (!isAdmin) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>Access Denied</h1>
        </header>
        <div className="admin-content">
          <p role="alert">You need an admin account to view this page.</p>
          <Link to="/lesson" className="header-link">Return to lessons</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <Link to="/admin" className="logo-link">
          <h1>Admin Panel</h1>
        </Link>
        <div className="header-right">
          <Link to="/ai-generator" className="header-link">🤖 AI Generator</Link>
          <Link to="/lesson" className="header-link">👀 View Student Area</Link>
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

      <div className="admin-content">
        <div className="admin-status">
          <p>✅ <strong>Admin Access Granted</strong> - Intelligent Tutoring System Management</p>
        </div>

        <div className="admin-tabs">
          <button
            className={`tab-button ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            Add Questions
          </button>
          <button
            className={`tab-button ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            Manage Questions
          </button>
          <button
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Manage Users
          </button>
          <button
            className={`tab-button ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            Skills
          </button>
          <button
            className={`tab-button ${activeTab === 'images' ? 'active' : ''}`}
            onClick={() => setActiveTab('images')}
          >
            🖼️ Images
          </button>
          <button
            className={`tab-button ${activeTab === 'badges' ? 'active' : ''}`}
            onClick={() => setActiveTab('badges')}
          >
            🏆 Badges
          </button>
        </div>

        {activeTab === 'add' && (
          <div className="tab-content">
            <h2>📝 Add New Question</h2>
            <p>Create new English learning content for the tutoring system.</p>

            <div className="admin-form">
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="skill">English Skill Category</label>
                  <select
                    id="skill"
                    name="skill"
                    value={formData.skill}
                    onChange={handleInputChange}
                  >
                    {(skills.length ? skills : ['vocabulary', 'grammar', 'reading_comprehension', 'spelling', 'writing']).map(
                      (skillKey) => (
                        <option key={skillKey} value={skillKey}>
                          {skillKey.replace(/_/g, ' ')}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="lesson">Lesson under this skill</label>
                  <select
                    id="lesson"
                    name="lesson"
                    value={formData.lesson}
                    onChange={handleInputChange}
                  >
                    {getLessonsForSkill(formData.skill).map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </option>
                    ))}
                  </select>
                  {getLessonsForSkill(formData.skill).length === 0 && (
                    <small>No lessons yet for this skill. Add one in the Skills tab.</small>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="question">Question</label>
                  <textarea
                    id="question"
                    name="question"
                    value={formData.question}
                    onChange={handleInputChange}
                    placeholder="Enter a clear, educational question..."
                    rows="3"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="answer">Correct Answer</label>
                  <input
                    type="text"
                    id="answer"
                    name="answer"
                    value={formData.answer}
                    onChange={handleInputChange}
                    placeholder="Enter the correct answer..."
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  Add Question to System
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="tab-content">
            <h2>🗂️ Question Management</h2>
            <p>Review and manage existing questions in the system.</p>

            {isLoading ? (
              <div className="loading">Loading questions...</div>
            ) : (
              <div className="questions-list">
                {allQuestions.length === 0 ? (
                  <p>No questions found in the system.</p>
                ) : (
                  allQuestions.map((question) => (
                    <div key={question.id} className="question-item">
                      <div className="question-header">
                        <span className="question-id">ID: {question.id}</span>
                        <span className="question-skill">{question.skill}</span>
                        {question.lesson && (
                          <span className="question-skill">Lesson: {question.lesson}</span>
                        )}
                      </div>
                      <div className="question-content">
                        <p><strong>Q:</strong> {question.question}</p>
                        <p><strong>A:</strong> {question.answer}</p>
                      </div>
                      <div className="question-actions">
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteQuestion(question.id)}
                        >
                          Delete Question
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="tab-content">
            <h2>👥 User Accounts</h2>
            <p>View and manage all registered accounts.</p>

            {isUsersLoading ? (
              <div className="loading">Loading users...</div>
            ) : (
              <div className="questions-list">
                {users.length === 0 ? (
                  <p>No users registered yet.</p>
                ) : (
                  users.map((user) => (
                    <div key={user.username} className="question-item">
                      <div className="question-header">
                        <span className="question-id">{user.username}</span>
                        <span className="question-skill">{user.role}</span>
                      </div>
                      <div className="question-content">
                        <p><strong>Name:</strong> {user.name || 'N/A'}</p>
                        <p><strong>Email:</strong> {user.email || 'N/A'}</p>
                        <p><strong>Level:</strong> {user.level}</p>
                      </div>
                      <div className="question-actions">
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteUser(user.username)}
                        >
                          Delete User
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="tab-content">
            <h2>🧠 Skills</h2>
            <p>Add new learning skills that questions can be mapped to.</p>

            <form className="admin-form" onSubmit={handleAddSkill}>
              <div className="input-group">
                <label htmlFor="newSkill">Skill Name</label>
                <input
                  id="newSkill"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="e.g. listening comprehension"
                />
              </div>
              <button type="submit" className="btn btn-primary">Add Skill</button>
            </form>

            <form className="admin-form" onSubmit={handleAddLesson} style={{ marginTop: '10px' }}>
              <div className="input-group">
                <label htmlFor="lessonSkill">Add Lesson to Skill</label>
                <select
                  id="lessonSkill"
                  value={newLesson.skill}
                  onChange={(e) => setNewLesson(prev => ({ ...prev, skill: e.target.value }))}
                >
                  {skills.map((skill) => (
                    <option key={skill} value={skill}>{skill.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="lessonTitle">Lesson Title</label>
                <input
                  id="lessonTitle"
                  value={newLesson.title}
                  onChange={(e) => setNewLesson(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Vocabulary Basics"
                />
              </div>
              <div className="input-group">
                <label htmlFor="lessonDescription">Lesson Description</label>
                <textarea
                  id="lessonDescription"
                  value={newLesson.description}
                  onChange={(e) => setNewLesson(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Short summary to guide admins and students"
                />
              </div>
              <button type="submit" className="btn btn-primary">Add Lesson</button>
            </form>

            <div className="skills-list" style={{ marginTop: '20px' }}>
              <h3>Available Skills</h3>
              {skills.length === 0 ? (
                <p>No skills found.</p>
              ) : (
                <div className="skill-tags">
                  {skillLessons.map(({ skill, lessons }) => (
                    <div key={skill} className="skill-tag" style={{ textAlign: 'left', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{skill.replace(/_/g, ' ')}</strong>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: '2px 8px', fontSize: '12px' }}
                          onClick={() => handleDeleteSkill(skill)}
                        >
                          Delete Skill
                        </button>
                      </div>
                      <div className="skill-subtext">{lessons.length} lesson{lessons.length !== 1 ? 's' : ''}</div>
                      <ul style={{ margin: '6px 0 0 12px' }}>
                        {lessons.map((lesson) => (
                          <li key={lesson.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>{lesson.title}</span>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ padding: '0 5px', fontSize: '10px' }}
                              onClick={() => handleDeleteLesson(skill, lesson.id, lesson.title)}
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div className="tab-content">
            <h2>🖼️ Image Management</h2>
            <p>Add images to lessons and questions to make them more engaging.</p>

            <div className="admin-form">
              <h3>Add Image to Lesson</h3>
              <form onSubmit={handleAddImageToLesson}>
                <div className="input-group">
                  <label htmlFor="lessonSelect">Select Lesson</label>
                  <select
                    id="lessonSelect"
                    value={selectedLesson}
                    onChange={(e) => setSelectedLesson(e.target.value)}
                  >
                    <option value="">-- Select a lesson --</option>
                    {skillLessons.map(({ skill, lessons }) =>
                      lessons.map((lesson) => (
                        <option key={lesson.id} value={`${skill}|${lesson.id}`}>
                          {skill.replace(/_/g, ' ')} - {lesson.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="imageUrl">Image URL</label>
                  <input
                    type="url"
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                  />
                  <small>Tip: Get free images from <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">Unsplash</a></small>
                </div>

                <div className="input-group">
                  <label htmlFor="imagePosition">Image Position</label>
                  <select
                    id="imagePosition"
                    value={imagePosition}
                    onChange={(e) => setImagePosition(e.target.value)}
                  >
                    <option value="header">Header (top of lesson)</option>
                    <option value="inline">Inline (middle of content)</option>
                    <option value="footer">Footer (bottom of lesson)</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary">
                  Add Image to Lesson
                </button>
              </form>
            </div>

            <div className="admin-form" style={{ marginTop: '30px' }}>
              <h3>Add Image to Question</h3>
              <form onSubmit={handleAddImageToQuestion}>
                <div className="input-group">
                  <label htmlFor="questionSelect">Select Question</label>
                  <select
                    id="questionSelect"
                    value={selectedQuestion}
                    onChange={(e) => setSelectedQuestion(e.target.value)}
                  >
                    <option value="">-- Select a question --</option>
                    {allQuestions.map((q) => (
                      <option key={q.id} value={q.id}>
                        ID {q.id}: {q.question.substring(0, 50)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="questionImageUrl">Image URL</label>
                  <input
                    type="url"
                    id="questionImageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  Add Image to Question
                </button>
              </form>
            </div>

            <div className="admin-info" style={{ marginTop: '30px' }}>
              <h3>💡 Image Tips</h3>
              <ul>
                <li>Use high-quality, relevant images</li>
                <li>Free sources: <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">Unsplash</a>, <a href="https://pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a>, <a href="https://pixabay.com" target="_blank" rel="noopener noreferrer">Pixabay</a></li>
                <li>Images make lessons more engaging for students</li>
                <li>For vocabulary: use images of the word being taught</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="tab-content">
            <h2>🏆 Create Custom Badge</h2>
            <p>Create special achievements for students to earn.</p>

            <div className="admin-form">
              <form onSubmit={handleCreateBadge}>
                <div className="input-group">
                  <label htmlFor="badgeId">Badge ID</label>
                  <input
                    type="text"
                    id="badgeId"
                    value={badgeForm.badge_id}
                    onChange={(e) => setBadgeForm({ ...badgeForm, badge_id: e.target.value })}
                    placeholder="speed_master"
                  />
                  <small>Use lowercase with underscores (e.g., speed_master, perfect_week)</small>
                </div>

                <div className="input-group">
                  <label htmlFor="badgeName">Badge Name</label>
                  <input
                    type="text"
                    id="badgeName"
                    value={badgeForm.name}
                    onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })}
                    placeholder="Speed Master"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="badgeDescription">Description</label>
                  <textarea
                    id="badgeDescription"
                    value={badgeForm.description}
                    onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })}
                    placeholder="Answer 10 questions in under 5 seconds each!"
                    rows="2"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="badgeIcon">Icon (Emoji)</label>
                  <input
                    type="text"
                    id="badgeIcon"
                    value={badgeForm.icon}
                    onChange={(e) => setBadgeForm({ ...badgeForm, icon: e.target.value })}
                    placeholder="⚡"
                    maxLength="2"
                  />
                  <small>Common: 🏆 ⚡ 🌟 🎯 🔥 💯 👑 🎓 📚 ✨</small>
                </div>

                <div className="input-group">
                  <label htmlFor="criteriaType">Badge Criteria Type</label>
                  <select
                    id="criteriaType"
                    value={badgeForm.criteria_type}
                    onChange={(e) => setBadgeForm({ ...badgeForm, criteria_type: e.target.value })}
                  >
                    <option value="accuracy">Accuracy-based (% correct)</option>
                    <option value="speed">Speed-based (seconds per question)</option>
                    <option value="streak">Streak-based (consecutive correct)</option>
                    <option value="total">Total-based (total questions)</option>
                    <option value="skill_mastery">Skill Mastery (100% in a skill)</option>
                    <option value="custom">Custom (manual award)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="criteriaValue">Criteria Value</label>
                  <input
                    type="number"
                    id="criteriaValue"
                    value={badgeForm.criteria_value}
                    onChange={(e) => setBadgeForm({ ...badgeForm, criteria_value: parseInt(e.target.value) })}
                    placeholder="80"
                  />
                  <small>
                    {badgeForm.criteria_type === 'accuracy' && 'Percentage (e.g., 80 for 80% accuracy)'}
                    {badgeForm.criteria_type === 'speed' && 'Seconds (e.g., 5 for under 5 seconds)'}
                    {badgeForm.criteria_type === 'streak' && 'Number of consecutive correct answers'}
                    {badgeForm.criteria_type === 'total' && 'Total number of questions'}
                    {badgeForm.criteria_type === 'skill_mastery' && 'Not used (automatic at 100%)'}
                    {badgeForm.criteria_type === 'custom' && 'Not used (manual award)'}
                  </small>
                </div>

                <button type="submit" className="btn btn-primary">
                  Create Badge
                </button>
              </form>
            </div>

            <div className="admin-info" style={{ marginTop: '30px' }}>
              <h3>💡 Badge Ideas</h3>
              <ul>
                <li><strong>Speed Demon ⚡:</strong> Answer 10 questions in under 5 seconds each</li>
                <li><strong>Perfect Week 🌟:</strong> Practice every day for 7 days</li>
                <li><strong>Accuracy Master 🎯:</strong> Maintain 90% accuracy over 20 questions</li>
                <li><strong>Streak King 🔥:</strong> Get 15 correct answers in a row</li>
                <li><strong>Century Club 💯:</strong> Answer 100 total questions</li>
                <li><strong>Scholar 🎓:</strong> Master all 5 skills</li>
              </ul>
            </div>
          </div>
        )}

        {feedback && (
          <div className="admin-feedback">
            <div className={`feedback-box ${feedback.isError ? 'incorrect' : 'correct'}`}>
              {feedback.message}
            </div>
          </div>
        )}

        <div className="admin-info">
          <h3>📊 System Status</h3>
          <p>✅ Backend API: Connected</p>
          <p>✅ Question Database: {allQuestions.length} questions loaded</p>
          <p>✅ Student Analytics: Active</p>
        </div>
      </div>
    </div>
  );
};

export default Admin;

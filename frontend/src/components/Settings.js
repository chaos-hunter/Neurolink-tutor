import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../apiConfig';

const Settings = ({ onLogout, userRole, studentId }) => {
  const [studentData, setStudentData] = useState({
    name: '',
    email: '',
    language_prefs: { learn: 'english', ui: 'english' }
  });

  const [feedback, setFeedback] = useState(null);
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /** 🔥 Danger Zone modal state */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [finalConfirm, setFinalConfirm] = useState(false);

  /** 🎵 Audio */
  const audioRef = useRef(null);
  const fadeInterval = useRef(null);

  /* ---------------------------------- */
  /* Utility Helpers */
  /* ---------------------------------- */

  const showFeedbackMsg = (message, isError = false) => {
    setFeedback({ message, isError });
    setTimeout(() => setFeedback(null), 3000);
  };

  const fadeInAudio = () => {
    if (!audioRef.current) return;

    audioRef.current.volume = 0;
    audioRef.current.play().catch(() => {});
    fadeInterval.current = setInterval(() => {
      if (audioRef.current.volume >= 0.5) {
        clearInterval(fadeInterval.current);
      } else {
        audioRef.current.volume += 0.05;
      }
    }, 100);
  };

  const fadeOutAudio = () => {
    if (!audioRef.current) return;

    clearInterval(fadeInterval.current);
    fadeInterval.current = setInterval(() => {
      if (audioRef.current.volume <= 0.05) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        clearInterval(fadeInterval.current);
      } else {
        audioRef.current.volume -= 0.05;
      }
    }, 100);
  };

  /* ---------------------------------- */
  /* API Calls */
  /* ---------------------------------- */

  const loadStudentData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/student-data?student_id=${studentId}`);
      setStudentData(res.data);
    } catch {
      showFeedbackMsg('Failed to load profile', true);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await axios.post(`${API_BASE}/api/user/delete-account`, { student_id: studentId });
      fadeOutAudio();
      alert('Account deleted successfully.');
      onLogout();
    } catch (err) {
      fadeOutAudio();
      showFeedbackMsg(err.response?.data?.error || 'Delete failed', true);
      closeDeleteModal();
    }
  };

  /* ---------------------------------- */
  /* Modal Controls */
  /* ---------------------------------- */

  const openDeleteModal = () => {
    setShowDeleteModal(true);
    setFinalConfirm(false);
    fadeInAudio();
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setFinalConfirm(false);
    fadeOutAudio();
  };

  /* ---------------------------------- */
  /* Lifecycle */
  /* ---------------------------------- */

  useEffect(() => {
    loadStudentData();

    const audio = new Audio(
      'https://archive.org/download/top-gun-original-motion-picture-soundtrack/01%20Danger%20Zone.mp3'
    );
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;

    return () => fadeOutAudio();
  }, []);

  /* ---------------------------------- */
  /* Render */
  /* ---------------------------------- */

  return (
    <div className="app-container">
      <header className="app-header">
        <Link to="/lesson"><h1>Settings</h1></Link>
        {userRole === 'admin' && <Link to="/admin">🔧 Admin</Link>}
      </header>

      <div className="settings-content">

        {/* Danger Zone */}
        <div className="settings-card danger-zone">
          <h2 style={{ color: '#ff3b30' }}>Danger Zone</h2>
          <p>Permanently delete your account.</p>
          <button className="btn btn-danger" onClick={openDeleteModal}>
            Delete My Account
          </button>
        </div>

        <button className="btn btn-secondary" onClick={onLogout}>
          Log Out
        </button>

        {feedback && (
          <div className={`feedback-box ${feedback.isError ? 'incorrect' : 'correct'}`}>
            {feedback.message}
          </div>
        )}
      </div>

      {/* 🔥 DELETE MODAL */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal danger-modal">
            {!finalConfirm ? (
              <>
                <h2>⚠️ Are you sure?</h2>
                <p>This will permanently delete your account and all progress.</p>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={closeDeleteModal}>
                    Cancel
                  </button>
                  <button className="btn btn-danger" onClick={() => setFinalConfirm(true)}>
                    Yes, Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>🔥 FINAL CONFIRMATION</h2>
                <p>This action CANNOT be undone.</p>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={closeDeleteModal}>
                    Abort
                  </button>
                  <button className="btn btn-danger" onClick={handleDeleteAccount}>
                    DELETE FOREVER
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

// FULL SETTINGS.JS WITH FIXED DANGER ZONE AUDIO + BONUS EFFECTS

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../apiConfig';

const Settings = ({ onLogout, darkMode, toggleDarkMode, userRole, studentId }) => {
  /* -------------------- STATE -------------------- */
  const [studentData, setStudentData] = useState({
    name: '',
    email: '',
    language_prefs: { learn: 'english', ui: 'english' }
  });

  const [feedback, setFeedback] = useState(null);
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [finalConfirm, setFinalConfirm] = useState(false);

  /* -------------------- AUDIO -------------------- */
  const audioRef = useRef(null);
  const fadeInterval = useRef(null);

  const fadeInAudio = (targetVolume = 0.5) => {
    if (!audioRef.current) return;
    clearInterval(fadeInterval.current);

    fadeInterval.current = setInterval(() => {
      if (audioRef.current.volume >= targetVolume) {
        audioRef.current.volume = targetVolume;
        clearInterval(fadeInterval.current);
      } else {
        audioRef.current.volume += 0.05;
      }
    }, 100);
  };

  const stopAudio = () => {
    if (!audioRef.current) return;
    clearInterval(fadeInterval.current);
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  };

  /* -------------------- HELPERS -------------------- */
  const showFeedback = (message, isError = false) => {
    setFeedback({ message, isError });
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadStudentData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/student-data?student_id=${studentId}`);
      setStudentData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  /* -------------------- EFFECTS -------------------- */
  useEffect(() => {
    loadStudentData();
    return () => stopAudio();
  }, []);

  /* -------------------- HANDLERS -------------------- */
  const handleFirstConfirm = () => {
    setFinalConfirm(true);

    // 🔥 MUST create + play audio inside click handler
    if (!audioRef.current) {
      const audio = new Audio(
        'https://archive.org/download/top-gun-original-motion-picture-soundtrack/01%20Danger%20Zone.mp3'
      );
      audio.loop = true;
      audio.volume = 0;
      audioRef.current = audio;
    }

    audioRef.current
      .play()
      .then(() => fadeInAudio(0.5))
      .catch(err => console.warn('Audio blocked:', err));
  };

  const handleDeleteAccount = async () => {
    try {
      // BONUS: volume boost on final click
      fadeInAudio(0.8);

      await axios.post(`${API_BASE}/api/user/delete-account`, {
        student_id: studentId
      });

      stopAudio();
      alert('Account deleted successfully.');
      onLogout();
    } catch (err) {
      showFeedback('Error deleting account', true);
      stopAudio();
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setFinalConfirm(false);
    stopAudio();
  };

  /* -------------------- RENDER -------------------- */
  return (
    <div className="app-container">
      <header className="app-header">
        <Link to="/lesson" className="logo-link"><h1>Settings</h1></Link>
        <div>
          <Link to="/lesson" className="header-link">Back</Link>
          {userRole === 'admin' && <Link to="/admin" className="header-link admin-link">Admin</Link>}
        </div>
      </header>

      <div className="settings-content">
        {/* DANGER ZONE */}
        <div className="settings-card danger-zone">
          <h2 style={{ color: '#ff3b30' }}>Danger Zone</h2>
          <p>Permanently delete your account.</p>
          <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>
            Delete My Account
          </button>
        </div>

        {feedback && (
          <div className={`feedback-box ${feedback.isError ? 'incorrect' : 'correct'}`}>
            {feedback.message}
          </div>
        )}
      </div>

      {/* 🔥 DELETE MODAL */}
      {showDeleteModal && (
        <div className="modal-overlay danger-pulse">
          <div className="modal danger-modal">
            {!finalConfirm ? (
              <>
                <h2>⚠️ Are you sure?</h2>
                <p>This action cannot be undone.</p>
                <div className="button-group">
                  <button className="btn btn-secondary" onClick={closeDeleteModal}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleFirstConfirm}>Yes, Continue</button>
                </div>
              </>
            ) : (
              <>
                <h2 className="danger-glow">🔥 FINAL CONFIRMATION</h2>
                <p>You are entering the <strong>Danger Zone</strong>.</p>
                <div className="button-group">
                  <button className="btn btn-secondary" onClick={closeDeleteModal}>Abort</button>
                  <button className="btn btn-danger shake" onClick={handleDeleteAccount}>
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


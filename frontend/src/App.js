import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Lesson from './components/Lesson';
import Profile from './components/Profile';
import Settings from './components/Settings';
import Admin from './components/Admin';
import AIGenerator from './components/AIGenerator';
import Badges from './components/Badges';
import Metrics from './components/Metrics';
import Results from './components/Results';
import './App.css';

// Main App Component
function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('student');
  const [studentId, setStudentId] = useState('');
  const [diagnosticComplete, setDiagnosticComplete] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [key, setKey] = useState(0); // Force re-render key

  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.body.classList.add('dark-mode');
    }
  }, []);

  const handleLogin = (role, id, isDiagnosticComplete) => {
    console.log('Login attempt with role:', role, 'id:', id, 'diagnostic:', isDiagnosticComplete);
    setIsLoggedIn(true);
    setUserRole(role);
    setStudentId(id);
    setDiagnosticComplete(isDiagnosticComplete);
    setKey(prev => prev + 1); // Force fresh routing

    // Clear any existing navigation history
    window.history.replaceState(null, '', '/');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole('student');
    setStudentId('');
    setKey(prev => prev + 1); // Force fresh routing

    // Clear browser history and go to root
    window.history.replaceState(null, '', '/');
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);

    if (newDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="App" key={key}>
      <Routes>
        <Route
          path="/"
          element={
            userRole === 'admin' ?
              <Navigate to="/admin" replace /> :
              <Navigate to="/lesson" replace />
          }
        />
        <Route
          path="/lesson"
          element={<Lesson
            onLogout={handleLogout}
            userRole={userRole}
            studentId={studentId}
            initialDiagnosticComplete={diagnosticComplete}
            onDiagnosticComplete={() => setDiagnosticComplete(true)}
          />}
        />
        <Route
          path="/profile"
          element={<Profile onLogout={handleLogout} userRole={userRole} studentId={studentId} />}
        />
        <Route
          path="/settings"
          element={
            <Settings
              onLogout={handleLogout}
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
              userRole={userRole}
              studentId={studentId}
            />
          }
        />
        <Route
          path="/admin"
          element={
            userRole === 'admin'
              ? <Admin onLogout={handleLogout} userRole={userRole} />
              : <Navigate to="/lesson" replace />
          }
        />
        <Route
          path="/ai-generator"
          element={
            userRole === 'admin'
              ? <AIGenerator onLogout={handleLogout} userRole={userRole} studentId={studentId} />
              : <Navigate to="/lesson" replace />
          }
        />
        <Route
          path="/badges"
          element={<Badges onLogout={handleLogout} userRole={userRole} studentId={studentId} />}
        />
        <Route
          path="/metrics"
          element={<Metrics onLogout={handleLogout} userRole={userRole} studentId={studentId} />}
        />
        <Route
          path="/results"
          element={<Results onLogout={handleLogout} userRole={userRole} studentId={studentId} />}
        />
        {/* Catch all route - redirect based on role */}
        <Route
          path="*"
          element={
            userRole === 'admin' ?
              <Navigate to="/admin" replace /> :
              <Navigate to="/lesson" replace />
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
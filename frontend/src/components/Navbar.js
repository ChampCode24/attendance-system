import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
  setShowLogoutConfirm(false);
  await logout();
  navigate('/');
};

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          SmartAttendance
        </div>
        {user && (
          <div className="navbar-user">
            <span>Welcome, {user.title} {user.name}</span>
            <button onClick={() => setShowLogoutConfirm(true)} className="btn-logout">
              Logout
            </button>
          </div>
        )}
      </nav>

      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Log Out</h3>
            <p>Are you sure you want to log out?</p>
            <div className="modal-buttons">
              <button onClick={handleLogout} className="btn-danger">
                Yes, Log Out
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getInitials = () => {
    if (!user) return '?';
    const first = user.first_name || user.name?.split(' ')[0] || '';
    const last = user.last_name || user.name?.split(' ')[1] || '';
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="profile-container">
      <h2 className="profile-title">Account Settings</h2>

      {/* User Info Card */}
      <div className="profile-card">
        <div className="profile-avatar">{getInitials()}</div>
        <div className="profile-info">
          <p className="profile-name">
            {user?.first_name || user?.name?.split(' ')[0]} {user?.last_name || user?.name?.split(' ')[1]}
          </p>
          <p className="profile-email">{user?.email}</p>
          <span className="profile-role-badge">{user?.role}</span>
        </div>
      </div>

      {/* Account Details */}
      <div className="profile-section">
        <h3 className="profile-section-title">Account Details</h3>
        <div className="profile-detail-card">
          <div className="profile-detail-row">
            <span className="detail-label">Title</span>
            <span className="detail-value">{user?.title}</span>
          </div>
          <div className="profile-detail-row">
            <span className="detail-label">Role</span>
            <span className="detail-value" style={{ textTransform: 'capitalize' }}>{user?.role}</span>
          </div>
          {user?.role === 'student' && (
            <>
              <div className="profile-detail-row">
                <span className="detail-label">Matric No</span>
                <span className="detail-value">{user?.matric_number}</span>
              </div>
              <div className="profile-detail-row">
                <span className="detail-label">Department</span>
                <span className="detail-value">{user?.department}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Display Settings */}
      <div className="profile-section">
        <h3 className="profile-section-title">Display</h3>
        <div className="profile-detail-card">
          <div className="profile-detail-row">
            <span className="detail-label">Dark Mode</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={toggleDarkMode}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <button
        className="btn-logout-full"
        onClick={() => setShowLogoutConfirm(true)}
      >
        Log Out
      </button>

      {/* Logout Confirmation Modal */}
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
    </div>
  );
};

export default Profile;
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const CheckEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || 'your email';

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="check-email-icon">📧</div>
        <h2>Check Your Email</h2>
        <p>We sent a verification link to:</p>
        <p className="email-highlight"><strong>{email}</strong></p>
        <p>Click the link in the email to verify your account before logging in.</p>
        <p className="spam-note">Don't see it? Check your spam folder.</p>
        <button onClick={() => navigate('/login')} className="btn-primary">
          Go to Login
        </button>
      </div>
    </div>
  );
};

export default CheckEmail;
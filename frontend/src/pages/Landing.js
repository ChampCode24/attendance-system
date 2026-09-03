import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div className="landing-card">
        <h1>SmartAttendance</h1>
        <p>A secure, intelligent attendance system for the University of Lagos</p>
        <div className="landing-buttons">
          <button onClick={() => navigate('/register')} className="btn-primary">
            Create Account
          </button>
          <button onClick={() => navigate('/login')} className="btn-secondary">
            Log In
          </button>
        </div>
      </div>
    </div>
  );
};

export default Landing;
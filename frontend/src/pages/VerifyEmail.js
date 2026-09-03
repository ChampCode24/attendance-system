import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    const handleVerification = async () => {
      try {
        // Get the tokens from the URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (accessToken && type === 'signup') {
          // Set the session using the tokens from the URL
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Session error:', error);
            setStatus('error');
            return;
          }

          setStatus('success');
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        } else if (accessToken && type === 'recovery') {
          // Handle password reset
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            setStatus('error');
            return;
          }

          navigate('/reset-password');
        } else {
          // Check if already has a session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setStatus('success');
            setTimeout(() => navigate('/dashboard'), 3000);
          } else {
            setStatus('error');
          }
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
      }
    };

    handleVerification();
  }, [navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <h2>Verifying your email...</h2>
            <p>Please wait a moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '3rem' }}>✅</div>
            <h2>Email Verified!</h2>
            <p>Your account has been verified successfully.</p>
            <p>Redirecting you to login...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '3rem' }}>❌</div>
            <h2>Verification Failed</h2>
            <p>The verification link may have expired.</p>
            <p>Please register again with the same email.</p>
            <button onClick={() => navigate('/register')} className="btn-primary" style={{ marginTop: '1rem' }}>
              Register Again
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import API from '../api/axios';

const Register = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    password: '',
    matric_number: '',
    department: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const fullName = `${formData.first_name} ${formData.middle_name} ${formData.last_name}`.trim();

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: 'http://localhost:3000/verify',
        }
      });

      if (signUpError) throw signUpError;

      await API.post('/auth/save-profile', {
        id: data.user.id,
        role,
        title: formData.title,
        name: fullName,
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,
        email: formData.email,
        matric_number: formData.matric_number,
        department: formData.department,
      });

      navigate('/check-email', {
        state: { email: formData.email }
      });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!role) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">SmartAttendance</div>
          <h2>Create an Account</h2>
          <p>Who are you signing up as?</p>
          <div className="role-buttons">
            <button onClick={() => setRole('lecturer')} className="btn-role">
              🎓 I am a Lecturer
            </button>
            <button onClick={() => setRole('student')} className="btn-role">
              📚 I am a Student
            </button>
          </div>
          <p className="auth-link" onClick={() => navigate('/login')}>
            Already have an account? Log in
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">SmartAttendance</div>
        <h2>Register as {role === 'lecturer' ? 'Lecturer' : 'Student'}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <select name="title" value={formData.title} onChange={handleChange} required>
              <option value="">Title</option>
              {role === 'lecturer' ? (
                <>
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                  <option value="Engr.">Engr.</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                </>
              ) : (
                <>
                  <option value="Mr.">Mr.</option>
                  <option value="Miss">Miss</option>
                  <option value="Mrs.">Mrs.</option>
                </>
              )}
            </select>
          </div>
          <input
            type="text"
            name="first_name"
            placeholder="First Name"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="middle_name"
            placeholder="Middle Name (optional)"
            value={formData.middle_name}
            onChange={handleChange}
          />
          <input
            type="text"
            name="last_name"
            placeholder="Last Name"
            value={formData.last_name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />
          {role === 'student' && (
            <>
              <input
                type="text"
                name="matric_number"
                placeholder="Matric Number"
                value={formData.matric_number}
                onChange={handleChange}
                required
              />
              <input
                type="text"
                name="department"
                placeholder="Department"
                value={formData.department}
                onChange={handleChange}
                required
              />
            </>
          )}
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Password (minimum 6 characters)"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {role === 'lecturer' && (
            <div className="checkbox-field">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <label htmlFor="terms">
                I agree to receive important email notifications regarding student attendance and academic performance alerts from SmartAttendance.
              </label>
            </div>
          )}
          <button
            type="submit"
            className="btn-primary"
            disabled={
              loading ||
              !formData.title ||
              !formData.first_name ||
              !formData.last_name ||
              !formData.email ||
              formData.password.length < 6 ||
              (role === 'student' && (!formData.matric_number || !formData.department)) ||
              (role === 'lecturer' && !agreedToTerms)
            }
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-link" onClick={() => setRole('')}>
          Go back
        </p>
      </div>
    </div>
  );
};

export default Register;
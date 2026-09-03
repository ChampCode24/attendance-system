import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [enrolmentCode, setEnrolmentCode] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await API.get('/courses/enrolled');
      setCourses(res.data.courses);
    } catch (err) {
      setError('Failed to load courses.');
    }
  };

  const handleJoinCourse = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await API.post('/courses/join', { enrolment_code: enrolmentCode });
      setSuccess(res.data.message);
      setEnrolmentCode('');
      setShowModal(false);
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join course.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="welcome-banner">
        <h2>Welcome back, {user?.first_name || user?.name?.split(' ')[0]} </h2>
        <p>Here are your courses</p>
      </div>

      <div className="dashboard-header">
        <h2>My Courses</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + Join Course
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {courses.length === 0 ? (
        <div className="empty-state">
          <p>You have not joined any courses yet. Ask your lecturer for an enrolment code.</p>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <div
              key={course.id}
              className="course-card"
              onClick={() => navigate(`/scan/${course.id}`)}
            >
              <h3>{course.course_code}</h3>
              <p>{course.course_title}</p>
              <span className="scan-hint">Tap to scan attendance</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Sheet Modal */}
      {showModal && (
        <div className="bottom-sheet-overlay" onClick={() => setShowModal(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-handle"></div>
            <h3 className="bottom-sheet-title">Join a Course</h3>
            <form onSubmit={handleJoinCourse}>
              <input
                type="text"
                placeholder="Enter 5-digit enrolment code"
                value={enrolmentCode}
                onChange={(e) => setEnrolmentCode(e.target.value.toUpperCase())}
                maxLength={5}
                required
              />
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Joining...' : 'Join Course'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
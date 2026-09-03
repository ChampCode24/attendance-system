import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const LecturerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ course_code: '', course_title: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await API.get('/courses/my-courses');
      setCourses(res.data.courses);
    } catch (err) {
      setError('Failed to load courses.');
    }
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await API.post('/courses/create', formData);
      setSuccess(`Course created! Enrolment code: ${res.data.course.enrolment_code}`);
      setFormData({ course_code: '', course_title: '' });
      setShowModal(false);
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create course.');
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
          + Add Course
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {courses.length === 0 ? (
        <div className="empty-state">
          <p>No courses yet. Add your first course to get started.</p>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <div
              key={course.id}
              className="course-card"
              onClick={() => navigate(`/course/${course.id}`)}
            >
              <h3>{course.course_code}</h3>
              <p>{course.course_title}</p>
              <span className="enrolment-code">
                Enrolment Code: <strong>{course.enrolment_code}</strong>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Sheet Modal */}
      {showModal && (
        <div className="bottom-sheet-overlay" onClick={() => setShowModal(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-handle"></div>
            <h3 className="bottom-sheet-title">Create New Course</h3>
            <form onSubmit={handleAddCourse}>
              <input
                type="text"
                placeholder="Course Code (e.g. CPE 519)"
                value={formData.course_code}
                onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Course Title"
                value={formData.course_title}
                onChange={(e) => setFormData({ ...formData, course_title: e.target.value })}
                required
              />
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Course'}
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

export default LecturerDashboard;
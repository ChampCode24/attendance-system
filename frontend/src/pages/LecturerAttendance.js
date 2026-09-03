import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const LecturerAttendance = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');

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

  return (
    <div className="dashboard-container">
      <h2 className="page-title">Start Attendance</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.2rem', fontSize: '0.9rem' }}>
        Select a course to start an attendance session.
      </p>
      {error && <div className="error-message">{error}</div>}
      {courses.length === 0 ? (
        <div className="empty-state">
          <p>No courses yet. Add a course from the Home tab first.</p>
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
              <span className="scan-hint">Tap to manage attendance →</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LecturerAttendance;
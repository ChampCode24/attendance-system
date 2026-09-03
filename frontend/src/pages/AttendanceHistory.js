import React, { useState, useEffect } from 'react';
import API from '../api/axios';

const toNigerianTime = (dateString) => {
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
};

const toNigerianDate = (dateString) => {
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const AttendanceHistory = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
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

  const fetchHistory = async (courseId) => {
    setSelectedCourse(courseId);
    setHistory([]);
    setSummary(null);
    setLoading(true);

    try {
      const res = await API.get(`/attendance/student-history/${courseId}`);
      setHistory(res.data.history);
      setSummary(res.data.summary);
    } catch (err) {
      setError('Failed to load attendance history.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <h2 className="page-title">My Attendance History</h2>
      {error && <div className="error-message">{error}</div>}

      {/* Course Selection */}
      <div className="form-card">
        <h3>Select Course</h3>
        <select
          value={selectedCourse}
          onChange={(e) => fetchHistory(e.target.value)}
          style={{
            width: '100%',
            padding: '0.8rem 1rem',
            borderRadius: '10px',
            border: '1.5px solid var(--border)',
            background: 'var(--input-bg)',
            color: 'var(--text)',
            fontSize: '0.95rem',
          }}
        >
          <option value="">-- Select a course --</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.course_code} - {course.course_title}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Card */}
      {summary && (
        <div className="attendance-summary-card">
          <div className="summary-item">
            <span className="summary-number">{summary.totalSessions}</span>
            <span className="summary-label">Total Sessions</span>
          </div>
          <div className="summary-item">
            <span className="summary-number" style={{ color: '#16a34a' }}>{summary.present}</span>
            <span className="summary-label">Present</span>
          </div>
          <div className="summary-item">
            <span className="summary-number" style={{ color: '#dc2626' }}>{summary.absent}</span>
            <span className="summary-label">Absent</span>
          </div>
          <div className="summary-item">
            <span className="summary-number" style={{ 
              color: summary.attendanceRate >= 75 ? '#16a34a' : summary.attendanceRate >= 60 ? '#854d0e' : '#dc2626' 
            }}>
              {summary.attendanceRate}%
            </span>
            <span className="summary-label">Attendance</span>
          </div>
        </div>
      )}

      {/* History List */}
      {loading && <div className="loading">Loading history...</div>}

      {history.length > 0 && (
        <div className="history-list">
          {history.map((record, index) => (
            <div key={index} className={`history-card ${record.status}`}>
              <div className="history-course">
                <h3>{toNigerianDate(record.session_date)}</h3>
                <p>{toNigerianTime(record.session_date)}</p>
              </div>
              <div className="history-details">
                <span className={`status-badge ${record.status}`}>
                  {record.status}
                </span>
                {record.scanned_at && (
                  <span className="history-date">
                    Scanned: {toNigerianTime(record.scanned_at)}
                  </span>
                )}
                {record.distance_m !== null && record.distance_m !== undefined && (
                  <span className="history-date">{record.distance_m}m away</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && selectedCourse && history.length === 0 && (
        <div className="empty-state">
          <p>No sessions found for this course yet.</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceHistory;
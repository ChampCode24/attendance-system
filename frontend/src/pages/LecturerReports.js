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

const LecturerReports = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [sessions, setSessions] = useState([]);
  const [report, setReport] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [error, setError] = useState('');
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

  const fetchSessions = async (courseId) => {
    setSelectedCourse(courseId);
    setSessions([]);
    setReport([]);
    setSelectedSession(null);
    try {
      const res = await API.get(`/attendance/sessions/${courseId}`);
      setSessions(res.data.sessions);
    } catch (err) {
      setError('Failed to load sessions.');
    }
  };

  const fetchReport = async (sessionId) => {
    setLoading(true);
    try {
      const res = await API.get(`/attendance/report/${sessionId}`);
      setReport(res.data.report);
      setSelectedSession(sessionId);
    } catch (err) {
      setError('Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    const session = sessions.find(s => s.id === selectedSession);
    const date = session ? toNigerianDate(session.created_at) : new Date().toLocaleDateString();

    const headers = ['Name', 'Matric Number', 'Department', 'Status', 'Distance', 'Time', 'Flagged'];
    const rows = report.map((log) => [
      log.users?.name || '',
      `="${log.users?.matric_number || ''}"`,
      log.users?.department || '',
      log.status.charAt(0).toUpperCase() + log.status.slice(1),
      log.distance_m !== null && log.distance_m !== undefined ? `${log.distance_m}m` : '-',
      log.scanned_at ? new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(log.scanned_at.endsWith('Z') ? log.scanned_at : log.scanned_at + 'Z')) : '-',
      log.is_flagged ? 'Yes' : 'No',
    ]);

    const csvContent = [
      [`Date: ${date}`],
      [],
      headers,
      ...rows,
    ].map((r) => r.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${date.replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFullReport = async () => {
    if (!selectedCourse) return;

    try {
      const res = await API.get(`/attendance/full-report/${selectedCourse}`);
      const { fullReport } = res.data;

      if (fullReport.length === 0) {
        setError('No sessions found for this course.');
        return;
      }

      const rows = [];

      fullReport.forEach((item) => {
        const sessionDate = toNigerianDate(item.session.created_at);
        const sessionTime = toNigerianTime(item.session.created_at);

        rows.push([`Date: ${sessionDate} - ${sessionTime}`]);
        rows.push(['Name', 'Matric Number', 'Department', 'Status', 'Distance', 'Time', 'Flagged']);

        item.logs.forEach((log) => {
          rows.push([
            log.users?.name || '',
            `="${log.users?.matric_number || ''}"`,
            log.users?.department || '',
            log.status.charAt(0).toUpperCase() + log.status.slice(1),
            log.distance_m !== null && log.distance_m !== undefined ? `${log.distance_m}m` : '-',
            log.scanned_at ? new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(log.scanned_at.endsWith('Z') ? log.scanned_at : log.scanned_at + 'Z')) : '-',
            log.is_flagged ? 'Yes' : 'No',
          ]);
        });

        rows.push([]);
      });

      const csvContent = rows.map((r) => r.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `full-report-${selectedCourse}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download full report.');
    }
  };

  const handleDeleteLog = async (logId) => {
  if (!window.confirm('Are you sure you want to remove this attendance record?')) return;
  try {
    await API.delete(`/attendance/log/${logId}`);
    setReport(report.filter(log => log.id !== logId));
  } catch (err) {
    setError('Failed to delete attendance record.');
  }
};

  return (
    <div className="dashboard-container">
      <h2 className="page-title">Attendance Reports</h2>
      {error && <div className="error-message">{error}</div>}

      <div className="form-card">
        <h3>Select Course</h3>
        <select
          value={selectedCourse}
          onChange={(e) => fetchSessions(e.target.value)}
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

      {sessions.length > 0 && (
        <div className="form-card">
          <h3>Select Session</h3>
          <div className="sessions-list">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`session-item ${selectedSession === session.id ? 'active' : ''}`}
                onClick={() => fetchReport(session.id)}
              >
                <span>{toNigerianDate(session.created_at)}</span>
                <span>{toNigerianTime(session.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="loading">Loading report...</div>}
      {report.length > 0 && (
        <div className="tab-content">
          <div className="report-header">
            <h3>Attendance Report</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleDownloadCSV} className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
               Download: This Session
              </button>
              <button onClick={handleDownloadFullReport} className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
               Download: Full Report
              </button>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Matric No</th>
                  <th>Status</th>
                  <th>Distance</th>
                  <th>Time</th>
                  <th>Flagged</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {report.map((log) => (
                 <tr key={log.id} className={log.is_flagged ? 'flagged-row' : ''}>
                 <td>{log.users?.name}</td>
                 <td>{log.users?.matric_number}</td>
                 <td>
                 <span className={`status-badge ${log.status}`}>
                 {log.status}
                 </span>
                 </td>
                 <td>{log.distance_m !== null && log.distance_m !== undefined ? `${log.distance_m}m` : '-'}</td>
                 <td>{log.scanned_at ? toNigerianTime(log.scanned_at) : '-'}</td>
                 <td>{log.is_flagged ? '⚠️ Yes' : 'No'}</td>
                 <td>
                 <button
                 onClick={() => handleDeleteLog(log.id)}
                 className="btn-danger"
                 style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                 >
              Remove
               </button>
               </td>
               </tr>
             ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerReports;
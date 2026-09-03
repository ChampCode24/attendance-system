import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import LecturerAnnouncements from './LecturerAnnouncements';
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

const CourseView = () => {
  const { courseId } = useParams();
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [radius, setRadius] = useState(50);
  const [qrPayload, setQrPayload] = useState('');
  const [report, setReport] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance');
  const [riskScores, setRiskScores] = useState([]);
  const [riskMessage, setRiskMessage] = useState('');
  const [showLocationConsent, setShowLocationConsent] = useState(false);

  useEffect(() => {
  fetchStudents();
  fetchSessions();
  fetchRiskScores();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [courseId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');
    const tab = params.get('tab');
    if (sessionId && tab === 'report') {
      handleViewReport(sessionId);
    }
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await API.get(`/courses/${courseId}/students`);
      setStudents(res.data.students);
    } catch (err) {
      setError('Failed to load students.');
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await API.get(`/attendance/sessions/${courseId}`);
      setSessions(res.data.sessions);
    } catch (err) {
      setError('Failed to load sessions.');
    }
  };

  const fetchRiskScores = async () => {
    try {
      const res = await API.get(`/attendance/risk-scores/${courseId}`);
      setRiskScores(res.data.riskScores || []);
      setRiskMessage(res.data.message || '');
    } catch (err) {
      console.error('Failed to fetch risk scores.');
    }
  };

  const handleStartAttendance = () => {
    setError('');
    setSuccess('');
    setLoading(true);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    // Check if location consent already given
    const locationConsent = localStorage.getItem('locationConsent');
    if (!locationConsent) {
      setShowLocationConsent(true);
      setLoading(false);
      return;
    }

    proceedWithAttendance();
  };

  const proceedWithAttendance = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await API.post('/attendance/start-session', {
            course_id: courseId,
            lecturer_lat: latitude,
            lecturer_lng: longitude,
            radius_m: radius,
          });
          setActiveSession(res.data);
          setQrPayload(res.data.qr_payload);
          setSuccess('Attendance session started. Show the QR code to your students.');
          fetchSessions();
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to start session.');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError('Location access denied. Please enable location services and try again.');
        setLoading(false);
      }
    );
  };

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to remove this student?')) return;
    try {
      await API.delete(`/courses/${courseId}/students/${studentId}`);
      fetchStudents();
    } catch (err) {
      setError('Failed to remove student.');
    }
  };

  const handleViewReport = async (sessionId) => {
    try {
      const res = await API.get(`/attendance/report/${sessionId}`);
      setReport(res.data.report);
      setSelectedSession(sessionId);
      setActiveTab('report');
      window.history.pushState({}, '', `${window.location.pathname}?session=${sessionId}&tab=report`);
    } catch (err) {
      setError('Failed to load report.');
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

  const handleDownloadCSV = () => {
    const date = new Date(report[0]?.scanned_at || new Date()).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' });

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

    const sessionDate = `Date: ${date}`;
    const csvContent = [
      [sessionDate],
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

  return (
    <div className="dashboard-container">
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="tab-buttons">
        <button
          className={activeTab === 'attendance' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('attendance')}
        >
          Attendance
        </button>
        <button
          className={activeTab === 'students' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('students')}
        >
          Students ({students.length})
        </button>
        <button
          className={activeTab === 'sessions' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('sessions')}
        >
          Sessions
        </button>
        <button
          className={activeTab === 'risk' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('risk')}
        >
          Risk Dashboard
        </button>
        <button
          className={activeTab === 'announcements' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('announcements')}
        >
          Announcements
        </button>
        {selectedSession && (
          <button
            className={activeTab === 'report' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('report')}
          >
            Report
          </button>
        )}
      </div>

      {activeTab === 'attendance' && (
        <div className="tab-content">
          {!activeSession ? (
            <div className="start-session">
              <h3>Start Attendance Session</h3>
              <p>Your GPS location will be captured when you start a session.</p>
              <div style={{ margin: '1rem 0' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  Scanning Radius: {radius}m
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  <span>1m</span>
                  <span>50m</span>
                  <span>100m</span>
                </div>
              </div>
              <button
                onClick={handleStartAttendance}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Getting Location...' : 'Start Attendance'}
              </button>
            </div>
          ) : (
            <div className="qr-container">
              <h3>Show this QR code to your students</h3>
              <div className="qr-code">
                <QRCode value={qrPayload} size={256} />
              </div>
              <p className="expiry-note">
                Expires at: {toNigerianTime(activeSession.expires_at)}
              </p>
              <button
                onClick={async () => {
                  if (loading) return;
                  setLoading(true);
                  try {
                    await API.post(`/attendance/end-session/${activeSession.session_id}`);
                  } catch (err) {
                    console.error('End session error:', err);
                  }
                  setActiveSession(null);
                  setSuccess('');
                  setLoading(false);
                  fetchRiskScores();
                }}
                className="btn-secondary"
                disabled={loading}
              >
                {loading ? 'Ending...' : 'End Session'}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'students' && (
        <div className="tab-content">
          <h3>Enrolled Students</h3>
          {students.length === 0 ? (
            <p>No students enrolled yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Matric No</th>
                  <th>Department</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.title} {student.name}</td>
                    <td>{student.matric_number}</td>
                    <td>{student.department}</td>
                    <td>
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        className="btn-danger"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="tab-content">
          <h3>Past Sessions</h3>
          {sessions.length === 0 ? (
            <p>No sessions held yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Expires At</th>
                  <th>Report</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td>{toNigerianDate(session.created_at)}</td>
                    <td>{toNigerianTime(session.created_at)}</td>
                    <td>{toNigerianTime(session.expires_at)}</td>
                    <td>
                      <button
                        onClick={() => handleViewReport(session.id)}
                        className="btn-secondary"
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="tab-content">
          <h3 style={{ marginBottom: '1rem', color: 'var(--text)' }}>Student Risk Dashboard</h3>
          {riskMessage && (
            <div className="info-message">{riskMessage}</div>
          )}
          {riskScores.length === 0 && !riskMessage && (
            <div className="empty-state">
              <p>No risk scores available yet.</p>
            </div>
          )}
          {riskScores.length > 0 && (
            <div className="risk-list">
              {riskScores.map((item) => (
                <div key={item.student.id} className={`risk-card ${item.isAtRisk ? 'at-risk' : 'safe'}`}>
                  <div className="risk-student-info">
                    <h4>{item.student.name}</h4>
                    <p>{item.student.matric_number}</p>
                  </div>
                  <div className="risk-metrics">
                    <div className="risk-metric">
                      <span className="metric-label">Attendance</span>
                      <span className="metric-value">{item.attendanceRate}%</span>
                    </div>
                    <div className="risk-metric">
                      <span className="metric-label">Punctuality</span>
                      <span className="metric-value">{item.punctualityScore}%</span>
                    </div>
                    <div className="risk-score-badge" style={{
                      background: item.riskScore > 0.65 ? '#fee2e2' : item.riskScore > 0.45 ? '#fef9c3' : '#dcfce7',
                      color: item.riskScore > 0.65 ? '#dc2626' : item.riskScore > 0.45 ? '#854d0e' : '#16a34a',
                    }}>
                      {item.riskScore > 0.65 ? '⚠️ At Risk' : item.riskScore > 0.45 ? '⚡ Warning' : '✓ On Track'}
                      <span style={{ fontSize: '0.75rem', display: 'block' }}>
                        Risk Score: {Math.round(item.riskScore * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="tab-content">
          <h3 style={{ marginBottom: '1rem', color: 'var(--text)' }}>Course Announcements</h3>
          <LecturerAnnouncements courseId={courseId} />
        </div>
      )}

      {activeTab === 'report' && report.length > 0 && (
        <div className="tab-content">
          <div className="report-header">
            <h3>Attendance Report</h3>
            <button onClick={handleDownloadCSV} className="btn-primary">
              Download CSV
            </button>
          </div>
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
      )}

      {/* Location Consent Modal */}
      {showLocationConsent && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📍</div>
            <h3>Location Access Required</h3>
            <p>SmartAttendance needs your location to record the classroom coordinates for student verification. Your location is only used when you start an attendance session.</p>
            <div className="modal-buttons">
              <button
                onClick={() => {
                  localStorage.setItem('locationConsent', 'true');
                  setShowLocationConsent(false);
                  proceedWithAttendance();
                }}
                className="btn-primary"
              >
                Allow Location Access
              </button>
              <button
                onClick={() => setShowLocationConsent(false)}
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

export default CourseView;
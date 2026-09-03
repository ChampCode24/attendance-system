import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

const toNigerianTime = (dateString) => {
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
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

const Announcements = () => {
  const { user, session } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await API.get('/courses/enrolled');
      setCourses(res.data.courses);
      // Fetch unread counts for all courses
      fetchAllUnreadCounts(res.data.courses);
    } catch (err) {
      setError('Failed to load courses.');
    }
  };

  const fetchAllUnreadCounts = async (courseList) => {
    const counts = {};
    for (const course of courseList) {
      try {
        const res = await API.get(`/courses/${course.id}/unread-count`);
        counts[course.id] = res.data.count;
      } catch (err) {
        counts[course.id] = 0;
      }
    }
    setUnreadCounts(counts);
  };

  useEffect(() => {
    if (!selectedCourse) return;

    fetchAnnouncements(selectedCourse);
    markAllAsRead(selectedCourse);

    const channel = supabase
      .channel(`announcements-student-${selectedCourse}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `course_id=eq.${selectedCourse}`,
      }, (payload) => {
        setAnnouncements(prev => [payload.new, ...prev]);
        markAsRead(payload.new.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCourse]);

  const fetchAnnouncements = async (courseId) => {
    setLoading(true);
    try {
      const res = await API.get(`/courses/${courseId}/announcements`);
      setAnnouncements(res.data.announcements);
    } catch (err) {
      setError('Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async (courseId) => {
    try {
      await API.post(`/courses/${courseId}/mark-read`);
      setUnreadCounts(prev => ({ ...prev, [courseId]: 0 }));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await API.post(`/courses/message/${messageId}/read`);
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="dashboard-container">
      <h2 className="page-title">Messages</h2>
      {error && <div className="error-message">{error}</div>}

      <div className="form-card">
        <h3>Select Course</h3>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
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
              {unreadCounts[course.id] > 0 ? ` (${unreadCounts[course.id]} new)` : ''}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="loading">Loading messages...</div>}

      {selectedCourse && !loading && (
        <div className="announcements-list">
          {announcements.length === 0 ? (
            <div className="empty-state">
              <p>No announcements for this course yet.</p>
            </div>
          ) : (
            announcements.map((ann) => (
              <div key={ann.id} className="announcement-card">
                <div className="announcement-header">
                  <span className="announcement-sender">
                    {ann.sender_title} {ann.sender_name}
                  </span>
                  <span className="announcement-time">
                    {toNigerianDate(ann.created_at)} {toNigerianTime(ann.created_at)}
                  </span>
                </div>
                <p className="announcement-message">{ann.message}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Announcements;
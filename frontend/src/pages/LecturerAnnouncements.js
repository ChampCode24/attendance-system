import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

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

const LecturerAnnouncements = ({ courseId }) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAnnouncements();

    const channel = supabase
      .channel(`announcements-lecturer-${courseId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `course_id=eq.${courseId}`,
      }, (payload) => {
        if (payload.new.sender_id === user?.id) {
          setAnnouncements(prev => [payload.new, ...prev]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId, user]);

  const fetchAnnouncements = async () => {
    try {
      const res = await API.get(`/courses/${courseId}/announcements`);
      // Only show announcements sent by this lecturer
      const myAnnouncements = res.data.announcements.filter(
        ann => ann.sender_id === user?.id
      );
      setAnnouncements(myAnnouncements);
    } catch (err) {
      setError('Failed to load announcements.');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await API.post(`/courses/${courseId}/announcements`, { message });
      setMessage('');
      setSuccess('Announcement sent to all students.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send announcement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Send Announcement */}
      <form onSubmit={handleSend} className="announcement-form">
        <textarea
          placeholder="Write an announcement to all students in this course..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="announcement-textarea"
          rows={3}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !message.trim()}
          style={{ width: 'auto', padding: '0.7rem 1.5rem' }}
        >
          {loading ? 'Sending...' : 'Send Announcement'}
        </button>
      </form>

      {/* Announcements List */}
      <div className="announcements-list">
        {announcements.length === 0 ? (
          <div className="empty-state">
            <p>No announcements sent yet.</p>
          </div>
        ) : (
          announcements.map((ann) => (
            <div key={ann.id} className="announcement-card lecturer-card">
              <div className="announcement-header">
                <span className="announcement-sender">You</span>
                <span className="announcement-time">
                  {toNigerianDate(ann.created_at)} {toNigerianTime(ann.created_at)}
                </span>
              </div>
              <p className="announcement-message">{ann.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LecturerAnnouncements;
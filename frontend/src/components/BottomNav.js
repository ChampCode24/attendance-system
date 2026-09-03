import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import API from '../api/axios';

const BottomNav = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.role === 'student') {
      fetchTotalUnread();

      // Listen for new messages to increase badge
      const channel = supabase
        .channel('message-reads-badge')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
        }, () => {
          // When a read is recorded, refresh the unread count
          fetchTotalUnread();
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        }, () => {
          // When a new message arrives, refresh the unread count
          fetchTotalUnread();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // Also refetch when pathname changes so badge updates when navigating
  useEffect(() => {
    if (user?.role === 'student') {
      fetchTotalUnread();
    }
  }, [location.pathname]);

  const fetchTotalUnread = async () => {
    try {
      const res = await API.get('/courses/total-unread');
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  const authPages = ['/', '/login', '/register', '/check-email', '/verify', '/forgot-password', '/reset-password'];

  if (!user || authPages.includes(location.pathname)) return null;

  const isLecturer = user.role === 'lecturer';

  const lecturerTabs = [
    { path: '/lecturer', icon: '🏠', label: 'Home' },
    { path: '/attendance', icon: '📋', label: 'Attendance' },
    { path: '/reports', icon: '📊', label: 'Reports' },
    { path: '/profile', icon: '👤', label: 'Profile' },
  ];

  const studentTabs = [
    { path: '/student', icon: '🏠', label: 'Home' },
    { path: '/scan-home', icon: '📷', label: 'Scan' },
    { path: '/my-attendance', icon: '📋', label: 'History' },
    { path: '/announcements', icon: '💬', label: 'Messages', badge: unreadCount },
    { path: '/profile', icon: '👤', label: 'Profile' },
  ];

  const tabs = isLecturer ? lecturerTabs : studentTabs;

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.path}
          className={`bottom-nav-item ${location.pathname === tab.path ? 'active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <span className="bottom-nav-icon">{tab.icon}</span>
            {tab.badge > 0 && (
              <span className="nav-badge">{tab.badge > 99 ? '99+' : tab.badge}</span>
            )}
          </div>
          <span className="bottom-nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
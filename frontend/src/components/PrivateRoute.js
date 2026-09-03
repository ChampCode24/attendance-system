import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, role }) => {
  const { user, loading, session } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;

  if (!session) return <Navigate to="/login" />;

  if (!user) return <div className="loading">Loading profile...</div>;

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'lecturer' ? '/lecturer' : '/student'} />;
  }

  return children;
};

export default PrivateRoute;
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import CheckEmail from './pages/CheckEmail';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import LecturerDashboard from './pages/LecturerDashboard';
import StudentDashboard from './pages/StudentDashboard';
import CourseView from './pages/CourseView';
import ScanQR from './pages/ScanQR';
import Profile from './pages/Profile';
import LecturerAttendance from './pages/LecturerAttendance';
import LecturerReports from './pages/LecturerReports';
import AttendanceHistory from './pages/AttendanceHistory';
import StudentScan from './pages/StudentScan';
import Announcements from './pages/Announcements';
import './App.css';

const AuthRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'lecturer') return <Navigate to="/lecturer" />;
  return <Navigate to="/student" />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Navbar />
          <div className="app-content">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/check-email" element={<CheckEmail />} />
              <Route path="/verify" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<AuthRedirect />} />
              <Route
                path="/lecturer"
                element={
                  <PrivateRoute role="lecturer">
                    <LecturerDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/student"
                element={
                  <PrivateRoute role="student">
                    <StudentDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/course/:courseId"
                element={
                  <PrivateRoute role="lecturer">
                    <CourseView />
                  </PrivateRoute>
                }
              />
              <Route
                path="/scan/:courseId"
                element={
                  <PrivateRoute role="student">
                    <ScanQR />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
              <Route
                path="/my-attendance"
                element={
                  <PrivateRoute role="student">
                    <AttendanceHistory />
                  </PrivateRoute>
                }
              />
              <Route
  path="/attendance"
  element={
    <PrivateRoute role="lecturer">
      <LecturerAttendance />
    </PrivateRoute>
  }
/>
<Route
  path="/reports"
  element={
    <PrivateRoute role="lecturer">
      <LecturerReports />
    </PrivateRoute>
  }
/>

<Route
  path="/scan-home"
  element={
    <PrivateRoute role="student">
      <StudentScan />
    </PrivateRoute>
  }
/>

<Route
  path="/announcements"
  element={
    <PrivateRoute role="student">
      <Announcements />
    </PrivateRoute>
  }
/>

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
          <BottomNav />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
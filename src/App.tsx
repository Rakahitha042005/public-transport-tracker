import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Intro from './components/Intro';
import Login from './components/Login';
import PassengerDashboard from './components/PassengerDashboard';
import DriverDashboard from './components/DriverDashboard';
import AdminDashboard from './components/AdminDashboard';

// Simple Auth Guard
const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role: string }) => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return <Navigate to="/login" />;
  
  const user = JSON.parse(userStr);
  if (user.role !== role) return <Navigate to="/login" />;
  
  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Intro />} />
        <Route path="/login" element={<Login />} />
        <Route 
          path="/passenger" 
          element={
            <ProtectedRoute role="passenger">
              <PassengerDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/driver" 
          element={
            <ProtectedRoute role="driver">
              <DriverDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

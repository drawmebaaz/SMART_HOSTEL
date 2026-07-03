import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/ProtectedRoute'
import AdminDashboard from './pages/AdminDashboard'
import AdminIssuesPage from './pages/AdminIssuesPage'
import AdminReportsPage from './pages/AdminReportsPage'
import IssueDetailPage from './pages/IssueDetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import StudentReportsPage from './pages/StudentReportsPage'
import StudentPortal from './pages/StudentPortal'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/student" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/student"
        element={
          <ProtectedRoute role="STUDENT">
            <StudentPortal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/reports"
        element={
          <ProtectedRoute role="STUDENT">
            <StudentReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/issues"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminIssuesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/issues/:issueId"
        element={
          <ProtectedRoute role="ADMIN">
            <IssueDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

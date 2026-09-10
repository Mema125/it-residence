import { Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ClassDetail from './pages/ClassDetail'
import JoinInvite from './pages/JoinInvite'
import AssessmentBuilder from './pages/AssessmentBuilder'
import AssessmentDetail from './pages/AssessmentDetail'
import AssessmentTake from './pages/AssessmentTake'
import SubmissionGrade from './pages/SubmissionGrade'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page">Chargement...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          IT Résidence
        </Link>
        {user && (
          <nav>
            <span className="hint">{user.full_name}</span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              Déconnexion
            </button>
          </nav>
        )}
      </header>
      <main>{children}</main>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/join/:token" element={<JoinInvite />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/classes/:classId"
        element={
          <RequireAuth>
            <ClassDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/classes/:classId/new-assessment"
        element={
          <RequireAuth>
            <AssessmentBuilder />
          </RequireAuth>
        }
      />
      <Route
        path="/assessments/:assessmentId"
        element={
          <RequireAuth>
            <AssessmentDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/submissions/:submissionId/take"
        element={
          <RequireAuth>
            <AssessmentTake />
          </RequireAuth>
        }
      />
      <Route
        path="/submissions/:submissionId/grade"
        element={
          <RequireAuth>
            <SubmissionGrade />
          </RequireAuth>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <AppRoutes />
      </Layout>
    </AuthProvider>
  )
}

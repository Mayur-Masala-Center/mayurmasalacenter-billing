import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { isOwner } from './lib/roles'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import ItemsPage from './pages/ItemsPage'
import ScanPage from './pages/ScanPage'
import DashboardPage from './pages/DashboardPage'

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--ink)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '16px',
    }}>
      <div style={{
        width: 56, height: 56,
        background: 'linear-gradient(135deg, var(--teal), #00a88c)',
        borderRadius: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.6rem',
        boxShadow: '0 8px 24px rgba(0,201,167,0.3)',
        animation: 'pulse 1.4s ease-in-out infinite',
      }}>🌶️</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Loading Mayur Masala…</div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(0.95)}}`}</style>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  return children
}

// Only owners can access the dashboard — others see a locked screen
function OwnerRoute({ children }) {
  const { session, user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (!isOwner(user?.email)) return <AccessDenied />
  return children
}

function PublicRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (session) return <Navigate to="/" replace />
  return children
}

function AccessDenied() {
  return (
    <div style={{
      minHeight: '80vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🔒</div>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
        Access Restricted
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 320, lineHeight: 1.6 }}>
        The billing dashboard is only accessible to authorised owners.
        Please contact the store owner if you need access.
      </p>
    </div>
  )
}

function Nav() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const owner = isOwner(user?.email)

  if (location.pathname === '/scan') return null

  // Short display name — first part of email before @
  const displayName = user?.email?.split('@')[0] ?? ''

  return (
    <nav className="nav">
      <NavLink to="/" className="nav-logo">
        <span style={{ fontSize: '1.1rem' }}>🌶️</span>
        Mayur <span>Masala</span>
      </NavLink>

      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Home
        </NavLink>
        <NavLink to="/items" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Items
        </NavLink>
        <NavLink to="/scan" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          📷 Scan
        </NavLink>

        {/* Dashboard only visible to owners */}
        {owner && (
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Dashboard
          </NavLink>
        )}

        {/* User chip + sign out */}
        <div style={{
          display: 'flex', alignItems: 'center',
          marginLeft: 6, paddingLeft: 10,
          borderLeft: '1px solid rgba(255,255,255,0.12)', gap: 6,
        }}>
          {owner && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 700,
              background: 'var(--teal-glow)', color: 'var(--teal)',
              border: '1px solid var(--teal)', borderRadius: 99,
              padding: '1px 7px', letterSpacing: '0.04em',
            }}>👑</span>
          )}
          <span style={{
            fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)',
            maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {displayName}
          </span>
          <button onClick={signOut} className="nav-link"
            style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', padding: '5px 8px' }}>
            Out
          </button>
        </div>
      </div>
    </nav>
  )
}

function AppShell() {
  return (
    <div className="app-shell">
      <Nav />
      <Routes>
        <Route path="/login"     element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/"          element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/items"     element={<ProtectedRoute><ItemsPage /></ProtectedRoute>} />
        <Route path="/scan"      element={<ProtectedRoute><ScanPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<OwnerRoute><DashboardPage /></OwnerRoute>} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

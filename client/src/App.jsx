import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { AdminRoute, GuestRoute, ProtectedRoute, UserRoute } from './auth/routes'
import Login from './pages/Login'
import Logout from './pages/Logout'
import Register from './pages/Register'
import Home from './pages/Home'
import Welcome from './pages/Welcome'
import Users from './pages/Users'
import Profile from './pages/Profile'
import AiPrompt from './pages/AiPrompt'

// The resume builder pulls in the PDF renderer, so it loads only when opened.
const ResumeBuilder = lazy(() => import('./pages/ResumeBuilder'))

// A data router (rather than <BrowserRouter>) is required for useBlocker,
// which the Profile page uses to warn about unsaved changes before navigating away.
const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        // Home is the layout (sidebar + content); child routes render inside it.
        path: '/home',
        element: <Home />,
        children: [
          { index: true, element: <Welcome /> },
          { element: <AdminRoute />, children: [{ path: 'users', element: <Users /> }] },
          {
            element: <UserRoute />,
            children: [
              { path: 'profile', element: <Profile /> },
              { path: 'ai-prompt', element: <AiPrompt /> },
              {
                path: 'resume',
                element: (
                  <Suspense fallback={<p className="muted">Loading…</p>}>
                    <ResumeBuilder />
                  </Suspense>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
  // Logging out is a navigation, so pages with unsaved changes can intercept it.
  { path: '/logout', element: <Logout /> },
  { path: '*', element: <Navigate to="/home" replace /> },
])

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

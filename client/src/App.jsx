import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { AdminRoute, GuestRoute, ProtectedRoute } from './auth/routes'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Welcome from './pages/Welcome'
import Users from './pages/Users'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            {/* Home is the layout (sidebar + content); child routes render inside it. */}
            <Route path="/home" element={<Home />}>
              <Route index element={<Welcome />} />
              <Route element={<AdminRoute />}>
                <Route path="users" element={<Users />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

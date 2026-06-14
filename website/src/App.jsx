import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import AppLayout from './pages/AppLayout.jsx'
import Me from './pages/Me.jsx'
import ServerView from './pages/ServerView.jsx'
import InviteJoin from './pages/InviteJoin.jsx'
import DmChat from './components/DmChat.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import Admin from './pages/Admin.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ServersProvider } from './context/ServersContext.jsx'
import { SocketProvider } from './context/SocketContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

function AppWithSocket() {
  const { user } = useAuth()
  return (
    <SocketProvider user={user}>
      <ServersProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/invite/:code" element={<InviteJoin />} />
          <Route path="/voxa" element={<AppLayout />}>
            <Route index element={<Navigate to="/voxa/me" replace />} />
            <Route path="me" element={<Me />} />
            <Route path="me/dms/:dmId" element={<DmChat />} />
            <Route path="servers/:serverId" element={<ServerView />} />
            <Route path="servers/:serverId/channels/:channelId" element={<ServerView />} />
          </Route>
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ServersProvider>
    </SocketProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppWithSocket />
      </AuthProvider>
    </ThemeProvider>
  )
}

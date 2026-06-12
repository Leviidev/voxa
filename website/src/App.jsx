import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import AppLayout from './pages/AppLayout.jsx'
import Me from './pages/Me.jsx'
import ServerView from './pages/ServerView.jsx'
import InviteJoin from './pages/InviteJoin.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ServersProvider } from './context/ServersContext.jsx'

export default function App() {
  return (
    <AuthProvider>
      <ServersProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/invite/:code" element={<InviteJoin />} />
          <Route path="/voxa" element={<AppLayout />}>
            <Route index element={<Navigate to="/voxa/me" replace />} />
            <Route path="me" element={<Me />} />
            <Route path="servers/:serverId" element={<ServerView />} />
            <Route path="servers/:serverId/channels/:channelId" element={<ServerView />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ServersProvider>
    </AuthProvider>
  )
}

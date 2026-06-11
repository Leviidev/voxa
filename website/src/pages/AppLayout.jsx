import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import ServerSidebar from '../components/ServerSidebar.jsx'
import ChannelSidebar from '../components/ChannelSidebar.jsx'

export default function AppLayout() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading])

  if (loading || !user) return (
    <div className="flex h-screen items-center justify-center bg-voxa-bg">
      <div className="w-10 h-10 border-2 border-voxa-red border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-voxa-bg">
      <ServerSidebar />
      <ChannelSidebar />
      <div className="flex flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}

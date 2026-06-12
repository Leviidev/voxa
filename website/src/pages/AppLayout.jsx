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
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-[#E53935] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      <ServerSidebar />
      <ChannelSidebar />
      <div className="flex flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}

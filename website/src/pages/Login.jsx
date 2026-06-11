import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const [params] = useSearchParams()
  const [isRegister, setIsRegister] = useState(params.get('mode') === 'register')
  const [form, setForm] = useState({ email: '', username: '', password: '', dob: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/voxa/me')
  }, [user])

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    if (!form.email || !form.password) { setError('Please fill in all required fields.'); setLoading(false); return }
    if (isRegister && !form.username) { setError('Choose a username.'); setLoading(false); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return }
    const userData = {
      id: 'u_' + Math.random().toString(36).slice(2),
      username: form.username || form.email.split('@')[0],
      email: form.email,
      discriminator: String(Math.floor(1000 + Math.random() * 9000)),
      avatar: null,
      status: 'online',
      createdAt: new Date().toISOString(),
    }
    login(userData)
    navigate('/voxa/me')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-voxa-bg flex items-center justify-center p-4 overflow-auto">
      <div className="absolute inset-0 bg-gradient-to-br from-voxa-red/10 via-transparent to-transparent pointer-events-none" />
      <div className="w-full max-w-md relative">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 bg-voxa-red rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-xl leading-none">v</span>
          </div>
          <span className="text-voxa-header font-bold text-2xl">voxa</span>
        </Link>

        <div className="bg-voxa-sidebar rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-voxa-header mb-1">
              {isRegister ? 'Create an account' : 'Welcome back!'}
            </h1>
            <p className="text-voxa-text-muted text-sm">
              {isRegister ? "Let's get you set up on Voxa." : "We're so excited to see you again!"}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/40 text-red-300 text-sm px-4 py-3 rounded-lg mb-5">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {isRegister && (
              <Field label="Username" name="username" type="text" value={form.username}
                onChange={handle} placeholder="cooluser123" required />
            )}
            <Field label="Email" name="email" type="email" value={form.email}
              onChange={handle} placeholder="you@example.com" required />
            <div>
              <label className="block text-voxa-header text-xs font-bold uppercase tracking-wider mb-1.5">
                Password <span className="text-voxa-red">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handle}
                  placeholder="••••••••"
                  className="w-full bg-voxa-input text-voxa-header rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-voxa-red/50 pr-10 placeholder:text-voxa-text-dim"
                  required
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-voxa-text-muted hover:text-voxa-header">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isRegister && (
              <Field label="Date of Birth" name="dob" type="date" value={form.dob}
                onChange={handle} required />
            )}

            {!isRegister && (
              <div className="text-right">
                <a href="#" className="text-voxa-red hover:underline text-xs">Forgot your password?</a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-voxa-red hover:bg-voxa-red-light disabled:opacity-60 text-white font-bold py-3 rounded-lg transition-all text-sm mt-1 hover:shadow-lg hover:shadow-voxa-red/30"
            >
              {loading ? 'Please wait…' : isRegister ? 'Continue' : 'Log In'}
            </button>
          </form>

          <p className="text-voxa-text-muted text-xs mt-5 text-center">
            {isRegister ? 'Already have an account? ' : 'Need an account? '}
            <button onClick={() => { setIsRegister(v => !v); setError('') }}
              className="text-voxa-red hover:underline font-medium">
              {isRegister ? 'Log in' : 'Register'}
            </button>
          </p>

          {isRegister && (
            <p className="text-voxa-text-dim text-xs mt-4 text-center leading-relaxed">
              By registering, you agree to Voxa's{' '}
              <a href="#" className="text-voxa-red hover:underline">Terms of Service</a> and{' '}
              <a href="#" className="text-voxa-red hover:underline">Privacy Policy</a>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, name, type, value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="block text-voxa-header text-xs font-bold uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-voxa-red">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-voxa-input text-voxa-header rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-voxa-red/50 placeholder:text-voxa-text-dim"
        required={required}
      />
    </div>
  )
}

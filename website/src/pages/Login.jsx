import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

export default function Login() {
  const [params] = useSearchParams()
  const [isRegister, setIsRegister] = useState(params.get('mode') === 'register')
  const [forgotPw, setForgotPw] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [twoFA, setTwoFA] = useState(null) // { tempToken }
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { if (user) navigate('/voxa/me') }, [user])

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        if (!form.username) { setError('Choose a username.'); setLoading(false); return }
        await register(form.email, form.username, form.password)
        navigate('/voxa/me')
      } else {
        const data = await login(form.email, form.password)
        if (data?.requires2FA) {
          setTwoFA({ tempToken: data.tempToken })
        } else {
          navigate('/voxa/me')
        }
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const submitForgot = async (e) => {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setError('')
    setLoading(true)
    try {
      await api.forgotPassword(forgotEmail.trim())
      setForgotSent(true)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const loginWithPasskey = async () => {
    setError('')
    setLoading(true)
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser')
      const { options, sessionKey } = await api.passkeyAuthOptions()
      const response = await startAuthentication({ optionsJSON: options })
      const data = await api.passkeyAuthenticate(sessionKey, response)
      localStorage.setItem('voxa_token', data.token)
      window.location.href = '/voxa/me'
    } catch (err) {
      if (err.name !== 'NotAllowedError') setError(err.message || 'Passkey sign-in failed')
    }
    setLoading(false)
  }

  const switchMode = () => {
    setIsRegister(v => !v)
    setForgotPw(false)
    setTwoFA(null)
    setError('')
    setForm({ email: '', username: '', password: '' })
  }

  if (twoFA) {
    return <TwoFAStep tempToken={twoFA.tempToken} onBack={() => setTwoFA(null)} />
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8 group">
          <div className="w-9 h-9 bg-[#E53935] rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <span className="text-white font-black text-xl leading-none">v</span>
          </div>
          <span className="text-[#1A1B1E] font-black text-xl tracking-tight">voxa</span>
        </Link>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E3E5E8]">
          {forgotPw ? (
            forgotSent ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} className="text-green-500" />
                </div>
                <h1 className="text-xl font-black text-[#1A1B1E] tracking-tight mb-2">Check your email</h1>
                <p className="text-[#5C6068] text-sm mb-6">If that address has a Voxa account, a reset link is on its way.</p>
                <button onClick={() => { setForgotPw(false); setForgotSent(false) }}
                  className="w-full bg-[#E53935] hover:bg-[#C62828] text-white font-bold py-3 rounded-xl transition-all text-sm shadow-sm">
                  Back to login
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => setForgotPw(false)}
                  className="flex items-center gap-1.5 text-[#96989D] hover:text-[#5C6068] text-sm mb-5 transition-colors -ml-1">
                  <ArrowLeft size={14} /> Back to login
                </button>
                <div className="mb-6">
                  <h1 className="text-xl font-black text-[#1A1B1E] tracking-tight mb-1">Reset your password</h1>
                  <p className="text-[#96989D] text-sm">Enter your email and we'll send a reset link.</p>
                </div>
                {error && <ErrorBox msg={error} />}
                <form onSubmit={submitForgot} className="space-y-4" noValidate>
                  <Field label="Email" name="forgot-email" type="email" value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)} placeholder="you@example.com" />
                  <Btn loading={loading} disabled={!forgotEmail.trim()}>Send reset link</Btn>
                </form>
              </>
            )
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-black text-[#1A1B1E] tracking-tight mb-1">
                  {isRegister ? 'Create your account' : 'Welcome back'}
                </h1>
                <p className="text-[#96989D] text-sm">
                  {isRegister ? 'Join Voxa — it takes 30 seconds.' : 'Good to see you again.'}
                </p>
              </div>

              {!isRegister && (
                <button onClick={loginWithPasskey} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 border border-[#E3E5E8] hover:bg-[#F7F8FA] text-[#1A1B1E] font-semibold py-2.5 rounded-xl transition-all text-sm mb-4 disabled:opacity-50">
                  <KeyRound size={15} className="text-[#5C6068]" />
                  Sign in with passkey
                </button>
              )}

              {!isRegister && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px bg-[#E3E5E8] flex-1" />
                  <span className="text-[#96989D] text-xs">or</span>
                  <div className="h-px bg-[#E3E5E8] flex-1" />
                </div>
              )}

              {error && <ErrorBox msg={error} />}

              <form onSubmit={submit} className="space-y-4" noValidate>
                {isRegister && (
                  <Field label="Username" name="username" value={form.username} onChange={handle} placeholder="cooluser" />
                )}
                <Field label="Email" name="email" type="email" value={form.email} onChange={handle} placeholder="you@example.com" />
                <div>
                  <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} name="password" value={form.password}
                      onChange={handle} placeholder="••••••••"
                      autoComplete={isRegister ? 'new-password' : 'current-password'}
                      required minLength={6}
                      className="w-full bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/25 focus:border-[#E53935] pr-10 placeholder:text-[#96989D] transition-all" />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#96989D] hover:text-[#5C6068] transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {isRegister && <p className="text-[#96989D] text-xs mt-1.5">At least 6 characters.</p>}
                </div>

                {!isRegister && (
                  <div className="text-right -mt-1">
                    <button type="button" onClick={() => { setForgotPw(true); setForgotEmail(form.email); setError('') }}
                      className="text-[#E53935] hover:text-[#C62828] text-xs transition-colors font-medium">
                      Forgot your password?
                    </button>
                  </div>
                )}

                <Btn loading={loading}>
                  {isRegister ? 'Create account' : 'Log in'}
                </Btn>
              </form>

              <p className="text-[#96989D] text-xs mt-5 text-center">
                {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                <button onClick={switchMode} className="text-[#E53935] hover:text-[#C62828] font-semibold transition-colors">
                  {isRegister ? 'Log in' : 'Sign up free'}
                </button>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-[#C0C2C7] text-xs mt-5">
          Need help?{' '}
          <a href="mailto:voxa@voxa.lol" className="text-[#96989D] hover:text-[#5C6068] transition-colors">voxa@voxa.lol</a>
        </p>
      </div>
    </div>
  )
}

function TwoFAStep({ tempToken, onBack }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setError('')
    setLoading(true)
    try {
      const data = await api.verify2FA(tempToken, code.trim())
      localStorage.setItem('voxa_token', data.token)
      window.location.href = '/voxa/me'
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 bg-[#E53935] rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-xl leading-none">v</span>
          </div>
          <span className="text-[#1A1B1E] font-black text-xl tracking-tight">voxa</span>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E3E5E8]">
          <button onClick={onBack} className="flex items-center gap-1.5 text-[#96989D] hover:text-[#5C6068] text-sm mb-5 transition-colors -ml-1">
            <ArrowLeft size={14} /> Back
          </button>
          <div className="mb-6">
            <h1 className="text-xl font-black text-[#1A1B1E] tracking-tight mb-1">Two-factor authentication</h1>
            <p className="text-[#96989D] text-sm">Enter the 6-digit code from your authenticator app, or a backup code.</p>
          </div>
          {error && <ErrorBox msg={error} />}
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-1.5">Code</label>
              <input
                type="text" value={code} onChange={e => setCode(e.target.value)}
                placeholder="000 000 or backup code" autoComplete="one-time-code" inputMode="text"
                maxLength={13}
                className="w-full bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/25 focus:border-[#E53935] placeholder:text-[#96989D] transition-all text-center tracking-widest text-base font-mono"
              />
            </div>
            <Btn loading={loading} disabled={!code.trim()}>Verify</Btn>
          </form>
        </div>
      </div>
    </div>
  )
}

function ErrorBox({ msg }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
      <AlertCircle size={15} className="shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  )
}

function Btn({ children, loading, disabled }) {
  return (
    <button type="submit" disabled={loading || disabled}
      className="w-full bg-[#E53935] hover:bg-[#C62828] disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-sm hover:shadow-md active:scale-[0.99]">
      {loading
        ? <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Please wait…
          </span>
        : children}
    </button>
  )
}

function Field({ label, name, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-[#1A1B1E] text-xs font-bold uppercase tracking-wider mb-1.5">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
        autoComplete={name === 'email' ? 'email' : name === 'username' ? 'username' : 'off'}
        required
        className="w-full bg-[#F7F8FA] border border-[#E3E5E8] text-[#1A1B1E] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E53935]/25 focus:border-[#E53935] placeholder:text-[#96989D] transition-all" />
    </div>
  )
}

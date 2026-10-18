import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function SignInModal({ onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('buy')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg(error.message)
    } else {
      onClose()
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      setErrorMsg(error.message)
    }
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-2xl max-w-md w-full mx-auto">
      <h2 className="text-2xl font-bold mb-2 text-gray-900">Welcome to Kinmel</h2>
      <p className="text-sm text-gray-600 mb-6">Sign in to post ads, save items and chat with sellers.</p>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded">
          {errorMsg}
        </div>
      )}

      {/* Role Selection */}
      <div className="mb-6 space-y-2">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">I am here to...</label>
        <div 
          onClick={() => setRole('buy')}
          className={`p-3 border rounded-lg cursor-pointer transition ${role === 'buy' ? 'border-orange-500 bg-orange-50/50' : 'border-gray-200'}`}
        >
          <div className="font-semibold text-sm text-gray-900">Buy things</div>
          <div className="text-xs text-gray-500">Browse, save and message sellers</div>
        </div>
        <div 
          onClick={() => setRole('sell')}
          className={`p-3 border rounded-lg cursor-pointer transition ${role === 'sell' ? 'border-orange-500 bg-orange-50/50' : 'border-gray-200'}`}
        >
          <div className="font-semibold text-sm text-gray-900">Sell things</div>
          <div className="text-xs text-gray-500">Post ads and manage my listings</div>
        </div>
        <div 
          onClick={() => setRole('both')}
          className={`p-3 border rounded-lg cursor-pointer transition ${role === 'both' ? 'border-orange-500 bg-orange-50/50' : 'border-gray-200'}`}
        >
          <div className="font-semibold text-sm text-gray-900">Both — buy and sell</div>
          <div className="text-xs text-gray-500">One profile, two modes. Switch anytime.</div>
        </div>
      </div>

      {/* Google Sign In */}
      <button
        onClick={handleGoogleLogin}
        className="w-full mb-4 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 p-3 rounded-lg font-medium hover:bg-gray-50 transition"
      >
        Continue with Google
      </button>

      <div className="relative flex py-3 items-center">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase tracking-wider">or use phone / email</span>
        <div className="flex-grow border-t border-gray-200"></div>
      </div>

      {/* Email / Password Form */}
      <form onSubmit={handleEmailLogin} className="space-y-4 mt-2">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-600 text-white p-3 rounded-lg font-medium hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? 'Signing in...' : 'Sign in →'}
        </button>
      </form>
    </div>
  )
}
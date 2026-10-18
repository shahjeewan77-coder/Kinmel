import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import SignInModal from './SignInModal'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500 font-medium">Loading Kinmel...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      {session ? (
        <div className="p-4 max-w-4xl mx-auto w-full flex justify-between items-center bg-white shadow-sm rounded-lg my-4">
          <p className="text-gray-700">Welcome, <span className="font-semibold">{session.user.email}</span></p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="py-12 flex-grow flex items-center justify-center">
          <SignInModal onClose={() => {}} />
        </div>
      )}
    </div>
  )
}
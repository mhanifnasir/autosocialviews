import React, { useState, useEffect, Component } from 'react'
import Dashboard from './components/Dashboard'
import api from './services/api'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('AutoViews Error Caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center mx-auto mb-3 text-rose-400 text-xl">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Display Error Recovered</h2>
            <p className="text-xs text-slate-400 mb-4 font-mono bg-black/50 p-2 rounded border border-slate-800 break-words text-left">
              {this.state.error?.message || 'An unexpected rendering error occurred'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.reload()
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded text-xs transition-colors cursor-pointer"
              >
                Reload Dashboard
              </button>
              <button
                onClick={async () => {
                  try {
                    await api.delete('/queue?all=true')
                  } catch (e) {}
                  try {
                    const currentSession = await api.get('/sessions/current')
                    if (currentSession.data?.id) {
                      await api.post(`/sessions/${currentSession.data.id}/reset`)
                    }
                  } catch (e) {}
                  this.setState({ hasError: false, error: null })
                  window.location.reload()
                }}
                className="bg-red-700 hover:bg-red-600 text-white font-semibold py-2.5 px-3 rounded text-xs transition-colors cursor-pointer"
                title="Wipe broken slots and reset to clean 2x2 state"
              >
                Reset & Reload
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const response = await api.get('/sessions/current')
        if (response.data && response.data.id) {
          setSession(response.data)
        } else {
          throw new Error('Invalid session response')
        }
      } catch (error) {
        console.log('Session not found, creating new session...')
        try {
          const newSession = await api.post('/sessions', {
            layoutType: '2x2',
            activePlayerCount: 4
          })
          setSession(newSession.data)
        } catch (createErr) {
          console.warn('Failed to reach backend, using offline fallback session:', createErr)
          // Fallback session so UI renders smoothly
          setSession({
            id: 1,
            user_id: 'default',
            layout_type: '2x2',
            active_players: 4
          })
        }
      } finally {
        setLoading(false)
      }
    }

    initializeSession()
  }, [])

  if (loading) {
    return (
      <div className="w-full h-screen bg-dark flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
        <div className="text-xs text-slate-400 font-medium">Initializing AutoViews...</div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Dashboard session={session} />
    </ErrorBoundary>
  )
}

export default App

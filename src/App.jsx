import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [sessions, setSessions] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [chatHistory, setChatHistory] = useState([])
  const [componentCode, setComponentCode] = useState({ jsx: '', css: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('jsx') // 'jsx', 'css', 'preview'

  // Auth states
  const [authMode, setAuthMode] = useState('login') // 'login' or 'signup'
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: ''
  })

  const API_BASE = 'https://component-generation-backend.onrender.com/api'

  useEffect(() => {
    if (token) {
      setIsAuthenticated(true)
      fetchUser()
      fetchSessions()
    }
  }, [token])

  const fetchUser = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
      } else {
        localStorage.removeItem('token')
        setToken(null)
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const endpoint = authMode === 'login' ? 'login' : 'signup'
      const response = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(authForm)
      })

      const data = await response.json()

      if (response.ok) {
        setToken(data.token)
        setUser(data.user)
        setIsAuthenticated(true)
        localStorage.setItem('token', data.token)
        setSuccess(authMode === 'login' ? 'Login successful!' : 'Account created successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Authentication failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setIsAuthenticated(false)
    setUser(null)
    setSessions([])
    setCurrentSession(null)
    setChatHistory([])
    setComponentCode({ jsx: '', css: '' })
  }

  const createSession = async () => {
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `Session ${sessions.length + 1}`,
          chatHistory: [],
          componentCode: { jsx: '', css: '' },
          editorState: {}
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSessions([...sessions, data.session])
        setCurrentSession(data.session)
        setSuccess('Session created successfully!')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (error) {
      setError('Failed to create session')
    }
  }

  const selectSession = (session) => {
    setCurrentSession(session)
    setChatHistory(session.chatHistory || [])
    setComponentCode(session.componentCode || { jsx: '', css: '' })
  }

  const sendMessage = async (message) => {
    if (!message.trim()) return

    const newMessage = {
      id: Date.now(),
      content: message,
      timestamp: new Date().toISOString(),
      sender: 'user'
    }

    setChatHistory([...chatHistory, newMessage])
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API_BASE}/ai/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: message })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const aiResponse = {
          id: Date.now() + 1,
          content: `I've generated a component based on your request: "${message}". Here's the code:`,
          timestamp: new Date().toISOString(),
          sender: 'ai'
        }
        
        setChatHistory(prev => [...prev, aiResponse])
        setComponentCode({
          jsx: data.component.jsx,
          css: data.component.css
        })
        
        // Update session with new code
        if (currentSession) {
          updateSessionCode(data.component)
        }
        
        setSuccess('Component generated successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const errorResponse = {
          id: Date.now() + 1,
          content: `Sorry, I couldn't generate the component. ${data.error || 'Please try again.'}`,
          timestamp: new Date().toISOString(),
          sender: 'ai'
        }
        setChatHistory(prev => [...prev, errorResponse])
        setError(data.error || 'Failed to generate component')
      }
    } catch (error) {
      console.error('AI request error:', error)
      const errorResponse = {
        id: Date.now() + 1,
        content: 'Sorry, there was an error generating the component. Please try again.',
        timestamp: new Date().toISOString(),
        sender: 'ai'
      }
      setChatHistory(prev => [...prev, errorResponse])
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const updateSessionCode = async (newCode) => {
    try {
      const response = await fetch(`${API_BASE}/sessions/${currentSession._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          componentCode: newCode,
          chatHistory: chatHistory
        })
      })
      
      if (response.ok) {
        const updatedSession = await response.json()
        setCurrentSession(updatedSession.session)
      }
    } catch (error) {
      console.error('Error updating session:', error)
    }
  }

  const [newMessage, setNewMessage] = useState('')

  const handleSendMessage = (e) => {
    e.preventDefault()
    sendMessage(newMessage)
    setNewMessage('')
  }

  // Component Preview
  const PreviewComponent = () => {
    if (!componentCode.jsx) {
      return (
        <div className="preview-placeholder">
          <p>No component to preview. Generate a component first!</p>
        </div>
      )
    }

    // Extract the JSX content for preview
    const extractJSXContent = (jsxCode) => {
      // Remove import statements and export
      let content = jsxCode
        .replace(/import\s+.*?from\s+['"][^'"]*['"];?\n?/g, '')
        .replace(/export\s+default\s+.*?;?\n?/g, '')
        .replace(/function\s+\w+\s*\([^)]*\)\s*\{?\s*return\s*\(/g, '')
        .replace(/\);?\s*\}?\s*$/g, '')
        .trim()

      // If we still have function wrapper, try to extract just the JSX
      if (content.includes('<div') || content.includes('<span') || content.includes('<button')) {
        return content
      }

      // Fallback: return the original JSX
      return jsxCode
    }

    const jsxContent = extractJSXContent(componentCode.jsx)

    return (
      <div className="preview-container">
        <div 
          className="preview-frame"
          dangerouslySetInnerHTML={{
            __html: `
              <style>${componentCode.css}</style>
              <div id="preview-root">
                ${jsxContent}
              </div>
            `
          }}
        />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="auth-container">
          <div className="auth-card">
            <h1>Component Generator</h1>
            <p className="auth-subtitle">Create beautiful React components with AI assistance</p>
            
            <div className="auth-tabs">
              <button 
                className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button 
                className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => setAuthMode('signup')}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuth} className="auth-form">
              {authMode === 'signup' && (
                <input
                  type="text"
                  placeholder="Full Name"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                  required
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={authForm.email}
                onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                required
              />
              <button type="submit" disabled={isLoading}>
                {isLoading ? 'Loading...' : authMode === 'login' ? 'Login' : 'Sign Up'}
              </button>
            </form>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>Component Generator</h1>
          <div className="user-info">
            <span>Welcome, {user?.name}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h3>Sessions</h3>
            <button onClick={createSession} className="new-session-btn">
              + New Session
            </button>
          </div>
          
          <div className="sessions-list">
            {sessions.map((session) => (
              <div 
                key={session._id}
                className={`session-item ${currentSession?._id === session._id ? 'active' : ''}`}
                onClick={() => selectSession(session)}
              >
                <h4>{session.title}</h4>
                <p>{new Date(session.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="no-sessions">No sessions yet. Create your first session!</p>
            )}
          </div>
        </aside>

        <main className="workspace">
          {currentSession ? (
            <>
              <div className="chat-section">
                <div className="chat-header">
                  <h3>Chat with AI</h3>
                </div>
                
                <div className="chat-messages">
                  {chatHistory.map((message) => (
                    <div key={message.id} className={`message ${message.sender}`}>
                      <div className="message-content">
                        {message.content}
                      </div>
                      <div className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                  {chatHistory.length === 0 && (
                    <div className="empty-chat">
                      <p>Start a conversation to generate components!</p>
                      <p className="chat-examples">
                        Try: "Create a button component" or "Make a card with image"
                      </p>
                    </div>
                  )}
                  {isLoading && (
                    <div className="message ai">
                      <div className="message-content">
                        <div className="loading-dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="chat-input">
                  <input
                    type="text"
                    placeholder="Describe the component you want to create..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isLoading}
                  />
                  <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Generating...' : 'Send'}
                  </button>
                </form>
              </div>

              <div className="code-section">
                <div className="code-tabs">
                  <button 
                    className={`code-tab ${activeTab === 'jsx' ? 'active' : ''}`}
                    onClick={() => setActiveTab('jsx')}
                  >
                    JSX
                  </button>
                  <button 
                    className={`code-tab ${activeTab === 'css' ? 'active' : ''}`}
                    onClick={() => setActiveTab('css')}
                  >
                    CSS
                  </button>
                  <button 
                    className={`code-tab ${activeTab === 'preview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('preview')}
                  >
                    Preview
                  </button>
                </div>
                
                <div className="code-editor">
                  {activeTab === 'preview' ? (
                    <PreviewComponent />
                  ) : (
                    <textarea
                      value={activeTab === 'jsx' ? componentCode.jsx : componentCode.css}
                      onChange={(e) => setComponentCode({
                        ...componentCode,
                        [activeTab]: e.target.value
                      })}
                      placeholder={`Your ${activeTab.toUpperCase()} code will appear here...`}
                      className="code-textarea"
                    />
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="no-session">
              <h3>Welcome to Component Generator!</h3>
              <p>Select a session from the sidebar or create a new one to get started.</p>
            </div>
          )}
        </main>
      </div>

      {error && <div className="error-toast">{error}</div>}
      {success && <div className="success-toast">{success}</div>}
    </div>
  )
}

export default App

import { useEffect, useState } from 'react'
import Login from './components/register/Login'
import Register from './components/register/Register'
import Dashboard from './components/dashboard/Dashboard'
import { getAccessToken } from './services/auth/authTokenService'
import logoImage from './assets/agile-bot-logo.png'
import teamIllustration from './assets/agile-team-illustration.png'
import './App.css'

type AuthMode = 'register' | 'login'

function App() {
  const [mode, setMode] = useState<AuthMode>('register')
  const [route, setRoute] = useState(() => window.location.pathname)

  useEffect(() => {
    const syncRoute = () => setRoute(window.location.pathname)
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
    setRoute(path)
  }

  if (route.startsWith('/dashboard') && getAccessToken()) {
    return <Dashboard pathname={route} onNavigate={navigate} onLogout={() => navigate('/')} />
  }

  const openDashboard = () => {
    navigate('/dashboard')
  }

  return (
    <main className="auth-page">
      <section className="intro-panel">
        <div>
          <div className="brand-lockup">
            <img className="brand-image" src={logoImage} alt="Agile Bot" />
          </div>

          <div className="intro-copy">
            <h1>Turn Ideas into<br />Impact, <em>Together.</em></h1>
            <p>Agile Bot helps teams plan, track, and deliver projects effortlessly with a simple and powerful Agile workflow.</p>
          </div>

          <ul className="benefit-list">
            <li><span>↯</span><div><b>Organize Work</b><small>Plan projects, sprints and tasks with clarity.</small></div></li>
            <li><span>♣</span><div><b>Collaborate Seamlessly</b><small>Keep your team aligned and productive.</small></div></li>
            <li><span>▥</span><div><b>Track Progress</b><small>Get real-time insights and stay on track.</small></div></li>
            <li><span>◉</span><div><b>Deliver Faster</b><small>Turn ideas into real results.</small></div></li>
          </ul>
        </div>

        <div className="workflow-art">
          <img className="workflow-image" src={teamIllustration} alt="A team collaborating around an Agile project board" />
        </div>

        <footer><span>© 2024 Agile Bot. All rights reserved.</span><span>Built for teams who build the future.</span></footer>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Authentication options">
            <button className={mode === 'register' ? 'active' : ''} type="button" onClick={() => setMode('register')}>Register</button>
            <button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => setMode('login')}>Login</button>
          </div>

          <div className="auth-heading">
            <h2>{mode === 'register' ? 'Create Your Account' : 'Welcome Back'}</h2>
            <p>{mode === 'register' ? 'Join Agile Bot and start building better together.' : 'Log in to continue building better together.'}</p>
          </div>

          {mode === 'register' ? <Register onLoginClick={() => setMode('login')} /> : <Login onRegisterClick={() => setMode('register')} onLoginSuccess={openDashboard} />}
        </div>
      </section>
    </main>
  )
}

export default App

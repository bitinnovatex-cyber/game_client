import React, { useState, useEffect } from 'react';
import ParticipantQuiz from './pages/ParticipantQuiz';
import AdminLogin from './pages/AdminLogin';
import AdminSignup from './pages/AdminSignup';
import AdminDashboard from './pages/AdminDashboard';
import SlideStudio from './pages/SlideStudio';
import AdminHostLive from './pages/AdminHostLive';
import { getToken } from './api';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('UI Error caught by boundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
          <div className="glass-panel animate-pop" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem 2rem' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#ff6677', marginBottom: '0.75rem' }}>
              Something went wrong
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', wordBreak: 'break-word' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentRoute, setCurrentRoute] = useState(getRouteInfo());

  function getRouteInfo() {
    // Check hash first, then pathname
    const hash = window.location.hash.replace(/^#/, '');
    const path = hash || window.location.pathname;

    if (path.startsWith('/signup')) {
      return { page: 'signup' };
    }
    if (path.startsWith('/login')) {
      return { page: 'login' };
    }
    if (path.startsWith('/admin/create')) {
      return { page: 'studio', quizId: 'new' };
    }
    if (path.startsWith('/admin/edit/')) {
      const quizId = path.replace('/admin/edit/', '').split('/')[0];
      return { page: 'studio', quizId };
    }
    if (path.startsWith('/admin/host/')) {
      const sessionId = path.replace('/admin/host/', '').split('/')[0];
      return { page: 'host', sessionId };
    }
    if (path.startsWith('/admin')) {
      return { page: 'admin' };
    }
    // Default: Root URL for participants ONLY
    return { page: 'quiz' };
  }

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentRoute(getRouteInfo());
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const renderPage = () => {
    // Protected route check for admin pages
    const token = getToken();
    if (['admin', 'studio', 'host'].includes(currentRoute.page) && !token) {
      return <AdminLogin />;
    }

    switch (currentRoute.page) {
      case 'signup':
        return <AdminSignup />;
      case 'login':
        return <AdminLogin />;
      case 'admin':
        return <AdminDashboard />;
      case 'studio':
        return <SlideStudio quizId={currentRoute.quizId} />;
      case 'host':
        return <AdminHostLive sessionId={currentRoute.sessionId} />;
      case 'quiz':
      default:
        return <ParticipantQuiz />;
    }
  };

  return (
    <ErrorBoundary>
      {renderPage()}
    </ErrorBoundary>
  );
}

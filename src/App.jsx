// Version 1.0 - Stable Baseline Release
import React, { useState, useEffect } from 'react';
import ParticipantQuiz from './pages/ParticipantQuiz';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import SlideStudio from './pages/SlideStudio';
import AdminHostLive from './pages/AdminHostLive';
import { getToken } from './api';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState(getRouteInfo());

  function getRouteInfo() {
    // Check hash first, then pathname
    const hash = window.location.hash.replace(/^#/, '');
    const path = hash || window.location.pathname;

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

  // Protected route check for admin pages
  const token = getToken();
  if (['admin', 'studio', 'host'].includes(currentRoute.page) && !token) {
    return <AdminLogin />;
  }

  switch (currentRoute.page) {
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
}

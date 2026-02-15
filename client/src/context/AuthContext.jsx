import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [hasCoursePurchased, setHasCoursePurchased] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/subscription', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setHasActiveSubscription(data.has_active_subscription || false);
      }
    } catch (err) {
      console.error('Subscription check failed:', err);
    }
  }, []);

  const checkCourseAccess = useCallback(async () => {
    try {
      const res = await fetch('/api/course/access', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setHasCoursePurchased(data.has_access || false);
      }
    } catch (err) {
      console.error('Course access check failed:', err);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/user', { credentials: 'include' });
      const data = await res.json();

      if (data.authenticated && data.user) {
        const user = data.user;
        setCurrentUser({
          id: user.id,
          email: user.email,
          name: user.first_name || user.email?.split('@')[0] || 'User',
          avatar: user.profile_image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.first_name || 'U')}`,
        });
        await checkSubscription();
        await checkCourseAccess();
      } else {
        setCurrentUser(null);
        setHasActiveSubscription(false);
        setHasCoursePurchased(false);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, [checkSubscription, checkCourseAccess]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Login failed');
    }
    const data = await res.json();
    const user = data.user;
    setCurrentUser({
      id: user.id,
      email: user.email,
      name: user.first_name || user.email?.split('@')[0] || 'User',
      avatar: user.profile_image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.first_name || 'U')}`,
    });
    await checkSubscription();
    await checkCourseAccess();
    return data;
  };

  const register = async (email, password, firstName, lastName) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Registration failed');
    }
    const data = await res.json();
    const user = data.user;
    setCurrentUser({
      id: user.id,
      email: user.email,
      name: user.first_name || user.email?.split('@')[0] || 'User',
      avatar: user.profile_image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.first_name || 'U')}`,
    });
    return data;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { credentials: 'include' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUser(null);
    setHasActiveSubscription(false);
    setHasCoursePurchased(false);
  };

  const value = {
    currentUser,
    hasActiveSubscription,
    hasCoursePurchased,
    loading,
    login,
    register,
    logout,
    checkAuth,
    checkSubscription,
    checkCourseAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

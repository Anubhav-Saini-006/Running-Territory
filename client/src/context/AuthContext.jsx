import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Configure Axios baseURL for Render backend deployment
  if (import.meta.env.VITE_API_URL) {
    axios.defaults.baseURL = import.meta.env.VITE_API_URL;
  }

  // Configure Axios default headers dynamically
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  // Verify and sync current user from backend without logging out on transient errors
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (token) {
        try {
          const response = await axios.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data && response.data.user) {
            setUser(response.data.user);
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
        } catch (error) {
          console.warn('Auth token verification response/error:', error.response?.data || error.message);
          // Only force logout if server explicitly rejects token with 401 or 403
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            logout();
          }
        }
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    };

    fetchCurrentUser();
  }, [token]);

  const saveAuthData = (newToken, newUser) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
      setToken(newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    }
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
    }
  };

  const register = async (username, email, password) => {
    const response = await axios.post('/api/auth/register', { username, email, password });
    return response.data;
  };

  const verifyEmail = async (email, code) => {
    const response = await axios.post('/api/auth/verify-email', { email, code });
    const { token: newToken, user: newUser } = response.data;
    if (newToken && newUser) {
      saveAuthData(newToken, newUser);
    }
    return response.data;
  };

  const resendVerification = async (email) => {
    const response = await axios.post('/api/auth/resend-verification', { email });
    return response.data;
  };

  const forgotPassword = async (email) => {
    const response = await axios.post('/api/auth/forgot-password', { email });
    return response.data;
  };

  const resetPassword = async (email, code, newPassword) => {
    const response = await axios.post('/api/auth/reset-password', { email, code, newPassword });
    return response.data;
  };

  const login = async (email, password) => {
    const response = await axios.post('/api/auth/login', { email, password });
    const { token: newToken, user: newUser } = response.data;
    if (newToken && newUser) {
      saveAuthData(newToken, newUser);
    }
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        register,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

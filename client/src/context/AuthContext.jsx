import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Configure Axios baseURL for Render backend deployment
  if (import.meta.env.VITE_API_URL) {
    axios.defaults.baseURL = import.meta.env.VITE_API_URL;
  }

  // Configure Axios default headers
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  // Load user on startup if token exists
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (token) {
        try {
          const response = await axios.get('/api/auth/me');
          setUser(response.data.user);
        } catch (error) {
          console.error('Failed to verify token:', error);
          logout();
        }
      }
      setLoading(false);
    };

    fetchCurrentUser();
  }, [token]);

  const register = async (username, email, password) => {
    const response = await axios.post('/api/auth/register', { username, email, password });
    return response.data;
  };

  const verifyEmail = async (email, code) => {
    const response = await axios.post('/api/auth/verify-email', { email, code });
    const { token: newToken, user: newUser } = response.data;
    if (newToken && newUser) {
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
    }
    return response.data;
  };

  const resendVerification = async (email) => {
    const response = await axios.post('/api/auth/resend-verification', { email });
    return response.data;
  };

  const login = async (email, password) => {
    const response = await axios.post('/api/auth/login', { email, password });
    const { token: newToken, user: newUser } = response.data;
    if (newToken && newUser) {
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
    }
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
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
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

// Set default base URL for axios
axios.defaults.baseURL = API_URL;

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Check if user is logged in on first render
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Set default headers for axios
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        if (storedUser) {
          // Use stored user data first to prevent logout on refresh
          setUser(JSON.parse(storedUser));
        }
        
        try {
          // Then verify with server in background
          const { data } = await axios.get('/api/auth/profile');
          
          if (data.success) {
            const userData = data.user;
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            // If token is invalid, remove it
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
          }
        } catch (error) {
          console.error('Error verifying authentication:', error);
          // Don't log out user immediately on network errors
          // This allows the app to work offline with stored credentials
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      }
      
      setLoading(false);
    };
    
    checkLoggedIn();
  }, []);
  
  // Register user
  const register = async (username, password) => {
    try {
      const { data } = await axios.post('/api/auth/register', {
        username,
        password,
      });
      
      if (data.success && data.user.token) {
        localStorage.setItem('token', data.user.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.user.token}`;
        setUser(data.user);
        return { success: true };
      }
      
      return { success: false, error: 'Registration failed' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed',
      };
    }
  };
  
  // Login user
  const login = async (username, password) => {
    try {
      const { data } = await axios.post('/api/auth/login', {
        username,
        password,
      });
      
      if (data.success && data.user.token) {
        localStorage.setItem('token', data.user.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.user.token}`;
        setUser(data.user);
        return { success: true };
      }
      
      return { success: false, error: 'Login failed' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  };
  
  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };
  
  const value = {
    user,
    loading,
    register,
    login,
    logout,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 
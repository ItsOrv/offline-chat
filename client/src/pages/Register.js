import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styled from 'styled-components';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!username || !password || !confirmPassword) {
      return setError('Please fill in all fields');
    }
    
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    
    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await register(username, password);
      
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (error) {
      setError('Error during registration');
      console.error('Registration error:', error);
    }
    
    setLoading(false);
  };
  
  return (
    <RegisterContainer>
      <RegisterCard>
        <h1>Register for Orv Chat</h1>
        <h3>Secure Communication Platform</h3>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-control"
              placeholder="Choose your username"
              disabled={loading}
            />
          </FormGroup>
          
          <FormGroup>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
              placeholder="Enter your password"
              disabled={loading}
            />
          </FormGroup>
          
          <FormGroup>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-control"
              placeholder="Confirm your password"
              disabled={loading}
            />
          </FormGroup>
          
          <Button type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </Button>
          
          <LoginLink>
            Already have an account? <Link to="/login">Login</Link>
          </LoginLink>
        </form>
      </RegisterCard>
    </RegisterContainer>
  );
};

const RegisterContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--bg-primary);
`;

const RegisterCard = styled.div`
  background-color: var(--bg-secondary);
  border-radius: 8px;
  box-shadow: 0 4px 20px var(--shadow-color);
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  
  h1 {
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    text-align: center;
  }
  
  h3 {
    margin-bottom: 2rem;
    color: var(--text-secondary);
    text-align: center;
    font-weight: normal;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-secondary);
  }
`;

const Button = styled.button`
  background-color: var(--accent-color);
  color: var(--text-primary);
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  font-weight: 500;
  width: 100%;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: var(--accent-hover);
  }
  
  &:disabled {
    background-color: #555;
    cursor: not-allowed;
  }
`;

const LoginLink = styled.div`
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
  
  a {
    color: var(--accent-color);
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const ErrorMessage = styled.div`
  background-color: rgba(231, 76, 60, 0.2);
  color: var(--danger-color);
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  border-radius: 4px;
  text-align: center;
  border: 1px solid var(--danger-color);
`;

export default Register; 
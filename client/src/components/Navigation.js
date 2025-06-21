import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';

const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <NavContainer>
      <NavBrand>
        <Link to="/">Orv Chat</Link>
      </NavBrand>
      
      <NavLinks>
        {user && (
          <>
            <NavItem>
              <Link to="/">Dashboard</Link>
            </NavItem>
            <NavItem>
              <Link to="/chat">Public Chat</Link>
            </NavItem>
            {user.isAdmin && (
              <NavItem>
                <Link to="/admin">Admin Panel</Link>
              </NavItem>
            )}
          </>
        )}
      </NavLinks>
      
      <NavAuth>
        {user ? (
          <>
            <UserInfo>
              <span>Welcome, </span>
              <strong>{user.username}</strong>
              {user.isAdmin && <AdminBadge>Admin</AdminBadge>}
            </UserInfo>
            <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
          </>
        ) : (
          <>
            <NavItem>
              <Link to="/login">Login</Link>
            </NavItem>
            <NavItem>
              <Link to="/register">Register</Link>
            </NavItem>
          </>
        )}
      </NavAuth>
    </NavContainer>
  );
};

const NavContainer = styled.nav`
  background-color: var(--bg-secondary);
  box-shadow: 0 1px 5px var(--shadow-color);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const NavBrand = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  
  a {
    color: var(--accent-color);
    text-decoration: none;
    
    &:hover {
      color: var(--accent-hover);
    }
  }
`;

const NavLinks = styled.ul`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
`;

const NavItem = styled.li`
  margin-left: 1.5rem;
  
  a {
    color: var(--text-secondary);
    text-decoration: none;
    font-weight: 500;
    
    &:hover {
      color: var(--text-primary);
    }
  }
`;

const NavAuth = styled.div`
  display: flex;
  align-items: center;
`;

const UserInfo = styled.div`
  margin-left: 1rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  
  strong {
    margin-right: 0.3rem;
    color: var(--accent-color);
  }
`;

const AdminBadge = styled.span`
  background-color: var(--danger-color);
  color: var(--text-primary);
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  margin-right: 0.5rem;
`;

const LogoutButton = styled.button`
  background-color: transparent;
  border: 1px solid var(--danger-color);
  color: var(--danger-color);
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    background-color: var(--danger-color);
    color: var(--text-primary);
  }
`;

export default Navigation; 
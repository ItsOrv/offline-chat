import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('messages');
  const [pendingMessages, setPendingMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const socketRef = useRef();
  
  // Initialize socket connection
  useEffect(() => {
    if (!user || !user.isAdmin) return;
    
    const serverUrl = process.env.REACT_APP_API_URL || '';
    socketRef.current = io(serverUrl);
    
    // Connect user
    socketRef.current.emit('user_connected', user.id);
    
    // Cleanup socket connection
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);
  
  // Set up socket event listeners
  useEffect(() => {
    if (!socketRef.current || !user || !user.isAdmin) return;
    
    // Listen for new pending messages
    socketRef.current.on('pending_approval', (message) => {
      console.log('New message pending approval:', message);
      setPendingMessages(prev => [...prev, message]);
    });
    
    // Listen for message rejections
    socketRef.current.on('message_rejected', (messageId) => {
      setPendingMessages(prev => prev.filter(msg => msg.id !== messageId && msg._id !== messageId));
    });
    
    // Listen for message approvals
    socketRef.current.on('approved_message', (message) => {
      setPendingMessages(prev => prev.filter(msg => msg.id !== message.id && msg._id !== message._id));
    });
    
    return () => {
      socketRef.current.off('pending_approval');
      socketRef.current.off('message_rejected');
      socketRef.current.off('approved_message');
    };
  }, [user]);
  
  // Fetch pending messages and users
  useEffect(() => {
    if (!user || !user.isAdmin) return;
    
    const fetchData = async () => {
      try {
        // Fetch pending messages
        const messagesResponse = await axios.get('/api/messages/pending');
        if (messagesResponse.data.success) {
          setPendingMessages(messagesResponse.data.messages);
        }
        
        // Fetch users
        const usersResponse = await axios.get('/api/users');
        if (usersResponse.data.success) {
          setUsers(usersResponse.data.users);
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
        setError('Error loading data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  // Handle approving a message
  const handleApproveMessage = async (messageId) => {
    if (!socketRef.current) return;
    
    try {
      // First try the socket approach (real-time)
      socketRef.current.emit('approve_message', messageId);
      
      // Also make the API call as a fallback
      const response = await axios.put(`/api/messages/${messageId}/approve`);
      
      if (response.data.success) {
        // Remove from pending messages
        setPendingMessages((prev) => prev.filter((msg) => msg.id !== messageId && msg._id !== messageId));
      }
    } catch (error) {
      console.error('Error approving message:', error);
    }
  };
  
  // Handle deleting a message
  const handleDeleteMessage = async (messageId) => {
    if (!socketRef.current) return;
    
    try {
      // First try the socket approach (real-time)
      socketRef.current.emit('reject_message', messageId);
      
      // Also make the API call as a fallback
      const response = await axios.delete(`/api/messages/${messageId}`);
      
      if (response.data.success) {
        // Remove from pending messages
        setPendingMessages((prev) => prev.filter((msg) => msg.id !== messageId && msg._id !== messageId));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };
  
  // Handle promoting/demoting user admin status
  const handleToggleAdmin = async (userId, isAdmin) => {
    try {
      const response = await axios.put(`/api/users/${userId}`, {
        isAdmin: !isAdmin,
      });
      
      if (response.data.success) {
        // Update users list with new admin status
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, isAdmin: !isAdmin } : u
          )
        );
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };
  
  if (!user || !user.isAdmin) {
    return (
      <>
        <Navigation />
        <AdminContainer>
          <AdminHeader>
            <h1>Access Denied</h1>
            <p>You need admin privileges to view this page.</p>
          </AdminHeader>
        </AdminContainer>
      </>
    );
  }
  
  return (
    <>
      <Navigation />
      <AdminContainer>
        <AdminHeader>
          <h1>Admin Panel</h1>
          <p>Manage messages and users</p>
        </AdminHeader>
        
        <TabsContainer>
          <Tab
            active={activeTab === 'messages'}
            onClick={() => setActiveTab('messages')}
          >
            Pending Messages {pendingMessages.length > 0 && <Badge>{pendingMessages.length}</Badge>}
          </Tab>
          <Tab
            active={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
          >
            User Management
          </Tab>
        </TabsContainer>
        
        {loading ? (
          <LoadingMessage>Loading...</LoadingMessage>
        ) : error ? (
          <ErrorMessage>{error}</ErrorMessage>
        ) : (
          <>
            {activeTab === 'messages' && (
              <ContentSection>
                <SectionTitle>Messages Awaiting Approval</SectionTitle>
                
                {pendingMessages.length === 0 ? (
                  <EmptyMessage>No messages awaiting approval.</EmptyMessage>
                ) : (
                  <MessageList>
                    {pendingMessages.map((message) => (
                      <MessageItem key={message.id || message._id}>
                        <MessageInfo>
                          <MessageSender>{message.sender?.username || 'User'}</MessageSender>
                          <MessageDate>
                            {new Date(message.createdAt).toLocaleString()}
                          </MessageDate>
                        </MessageInfo>
                        <MessageContent>{message.content}</MessageContent>
                        <MessageActions>
                          <ApproveButton onClick={() => handleApproveMessage(message.id || message._id)}>
                            Approve
                          </ApproveButton>
                          <RejectButton onClick={() => handleDeleteMessage(message.id || message._id)}>
                            Reject
                          </RejectButton>
                        </MessageActions>
                      </MessageItem>
                    ))}
                  </MessageList>
                )}
              </ContentSection>
            )}
            
            {activeTab === 'users' && (
              <ContentSection>
                <SectionTitle>User Management</SectionTitle>
                
                {users.length === 0 ? (
                  <EmptyMessage>No users found.</EmptyMessage>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Status</th>
                        <th>Last Seen</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>{u.username}</td>
                          <td>
                            {u.isAdmin ? (
                              <AdminBadge>Admin</AdminBadge>
                            ) : (
                              <UserBadge>Regular User</UserBadge>
                            )}
                          </td>
                          <td>{new Date(u.lastSeen).toLocaleString()}</td>
                          <td>
                            {u.id !== user.id && (
                              <ActionButton
                                isAdmin={u.isAdmin}
                                onClick={() => handleToggleAdmin(u.id, u.isAdmin)}
                              >
                                {u.isAdmin ? 'Remove Admin' : 'Make Admin'}
                              </ActionButton>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </ContentSection>
            )}
          </>
        )}
      </AdminContainer>
    </>
  );
};

const AdminContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const AdminHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  
  h1 {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }
  
  p {
    color: var(--text-secondary);
  }
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border-color);
`;

const Tab = styled.button`
  padding: 0.8rem 1.5rem;
  background-color: transparent;
  border: none;
  cursor: pointer;
  font-weight: 500;
  font-size: 1rem;
  color: ${(props) => (props.active ? 'var(--accent-color)' : 'var(--text-secondary)')};
  border-bottom: ${(props) => (props.active ? '3px solid var(--accent-color)' : 'none')};
  margin-bottom: -1px;
  position: relative;
  
  &:hover {
    color: var(--accent-color);
  }
`;

const Badge = styled.span`
  position: absolute;
  top: 0;
  right: 0;
  background-color: var(--danger-color);
  color: white;
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 50%;
  min-width: 1rem;
  text-align: center;
`;

const ContentSection = styled.div`
  background-color: var(--bg-secondary);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--shadow-color);
  padding: 2rem;
`;

const SectionTitle = styled.h2`
  color: var(--text-primary);
  margin-bottom: 1.5rem;
  font-size: 1.3rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
`;

const LoadingMessage = styled.div`
  text-align: center;
  color: var(--text-secondary);
  margin: 2rem 0;
  font-size: 1.1rem;
`;

const ErrorMessage = styled.div`
  text-align: center;
  color: var(--danger-color);
  margin: 2rem 0;
  font-weight: 500;
`;

const EmptyMessage = styled.div`
  text-align: center;
  color: var(--text-secondary);
  margin: 2rem 0;
`;

const MessageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const MessageItem = styled.div`
  padding: 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-tertiary);
`;

const MessageInfo = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const MessageSender = styled.div`
  font-weight: 500;
  color: var(--text-primary);
`;

const MessageDate = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const MessageContent = styled.div`
  margin-bottom: 1.5rem;
  background-color: var(--bg-primary);
  padding: 1rem;
  border-radius: 4px;
  word-break: break-word;
  color: var(--text-secondary);
`;

const MessageActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

const ApproveButton = styled.button`
  background-color: var(--success-color);
  color: var(--text-primary);
  border: none;
  border-radius: 4px;
  padding: 0.6rem 1.2rem;
  cursor: pointer;
  
  &:hover {
    background-color: #27ae60;
  }
`;

const RejectButton = styled.button`
  background-color: var(--danger-color);
  color: var(--text-primary);
  border: none;
  border-radius: 4px;
  padding: 0.6rem 1.2rem;
  cursor: pointer;
  
  &:hover {
    background-color: #c0392b;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }
  
  th {
    color: var(--text-primary);
    font-weight: 500;
  }
  
  td {
    color: var(--text-secondary);
  }
  
  tbody tr:hover {
    background-color: var(--bg-tertiary);
  }
`;

const AdminBadge = styled.span`
  background-color: var(--danger-color);
  color: var(--text-primary);
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
`;

const UserBadge = styled.span`
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
`;

const ActionButton = styled.button`
  background-color: ${(props) => (props.isAdmin ? 'var(--danger-color)' : 'var(--accent-color)')};
  color: var(--text-primary);
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  
  &:hover {
    background-color: ${(props) => (props.isAdmin ? '#c0392b' : 'var(--accent-hover)')};
  }
`;

export default AdminDashboard; 
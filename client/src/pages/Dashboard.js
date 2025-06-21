import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import { SOCKET_URL } from '../config';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [error, setError] = useState('');
  const socketRef = useRef();
  
  // Initialize socket connection
  useEffect(() => {
    if (!user) return;
    
    socketRef.current = io(SOCKET_URL);
    
    // Connect user
    socketRef.current.emit('user_connected', user.id);
    
    // Clean up socket connection on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);
  
  // Set up socket event listeners
  useEffect(() => {
    if (!socketRef.current || !user) return;
    
    // Listen for private messages
    socketRef.current.on('receive_private_message', (message) => {
      console.log('Received private message in dashboard:', message);
      // Refresh unread messages
      fetchUnreadMessages();
      // Add notification sound
      const audio = new Audio('/notification.mp3');
      audio.play().catch(e => console.log('Error playing notification sound:', e));
    });
    
    return () => {
      socketRef.current.off('receive_private_message');
    };
  }, [user]);
  
  // Fetch unread private messages
  const fetchUnreadMessages = async () => {
    if (!user) return;
    
    try {
      setError('');
      const { data } = await axios.get('/api/messages/private/unread');
      if (data.success) {
        console.log('Unread messages data:', data);
        // Make sure each item has an id property
        const formattedMessages = data.messageCounts.map(item => ({
          ...item,
          id: item.id || item.senderId // Use id if available, otherwise use senderId
        }));
        setUnreadMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error fetching unread messages:', error);
      setError('Error loading messages');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch user's conversations
  const fetchConversations = async () => {
    if (!user) return;
    
    try {
      setError('');
      const { data } = await axios.get('/api/messages/private/conversations');
      if (data.success) {
        console.log('Conversations data:', data);
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      // Don't show error for this as it's not critical
    }
  };
  
  // Fetch data on component mount
  useEffect(() => {
    if (!user) return;
    
    fetchUnreadMessages();
    fetchConversations();
  }, [user]);
  
  // Handle user search
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchUsername.trim()) {
      setSearchError('Please enter a username');
      setTimeout(() => setSearchError(''), 3000);
      return;
    }
    
    setSearching(true);
    setSearchError('');
    
    try {
      const { data } = await axios.get(`/api/users/search/${searchUsername}`);
      
      if (data.success) {
        setSearchResults(data.users);
        if (data.users.length === 0) {
          setSearchError('No users found');
          setTimeout(() => setSearchError(''), 3000);
        }
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchError('Error searching users');
      setTimeout(() => setSearchError(''), 3000);
    } finally {
      setSearching(false);
    }
  };
  
  // Navigate to private chat
  const goToPrivateChat = (userId) => {
    navigate(`/private-chat/${userId}`);
  };
  
  if (!user) {
    return <div>Please log in to view this page.</div>;
  }
  
  return (
    <>
      <Navigation />
      <DashboardContainer>
        <Header>
          <h1>User Dashboard</h1>
          <p>Welcome to Orv Chat Platform</p>
        </Header>
        
        <CardsContainer>
          <Card>
            <h2>Public Chatroom</h2>
            <p>Chat with other users in the public chatroom. Your messages will be displayed after admin approval.</p>
            <CardFooter>
              <Link to="/chat">
                <Button>Enter Chatroom</Button>
              </Link>
            </CardFooter>
          </Card>
          
          <Card>
            <h2>Private Messages</h2>
            <p>Chat privately with other users.</p>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            {loading ? (
              <p>Loading...</p>
            ) : (
              <>
                {unreadMessages.length > 0 && (
                  <UnreadContainer>
                    <h3>Unread Messages:</h3>
                    <UnreadList>
                      {unreadMessages.map((item, index) => (
                        <UnreadItem key={index}>
                          <div onClick={() => goToPrivateChat(item.id)}>
                            <span>{item.username}</span>
                            <UnreadBadge>{item.count}</UnreadBadge>
                          </div>
                        </UnreadItem>
                      ))}
                    </UnreadList>
                  </UnreadContainer>
                )}
                
                {conversations.length > 0 && (
                  <ConversationsContainer>
                    <h3>Recent Conversations:</h3>
                    <ConversationsList>
                      {conversations.map((convo) => (
                        <ConversationItem key={convo.userId}>
                          <div onClick={() => goToPrivateChat(convo.userId)}>
                            <span>{convo.username}</span>
                            <small>{new Date(convo.lastMessageTime).toLocaleString()}</small>
                          </div>
                        </ConversationItem>
                      ))}
                    </ConversationsList>
                  </ConversationsContainer>
                )}
                
                {unreadMessages.length === 0 && conversations.length === 0 && (
                  <p>No messages. Start a conversation!</p>
                )}
              </>
            )}
            <CardFooter>
              <SearchUserForm onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Enter username..."
                  className="form-control"
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                  disabled={searching}
                />
                <SearchButton type="submit" disabled={searching}>
                  {searching ? 'Searching...' : 'Search'}
                </SearchButton>
              </SearchUserForm>
              
              {searchError && <SearchError>{searchError}</SearchError>}
              
              {searchResults.length > 0 && (
                <SearchResultsContainer>
                  <h3>Search Results:</h3>
                  <SearchResultsList>
                    {searchResults.map((result) => (
                      <SearchResultItem key={result.id}>
                        <div onClick={() => goToPrivateChat(result.id)}>
                          <span>{result.username}</span>
                          <small>{result.isAdmin ? '(Admin)' : ''}</small>
                        </div>
                      </SearchResultItem>
                    ))}
                  </SearchResultsList>
                </SearchResultsContainer>
              )}
            </CardFooter>
          </Card>
          
          {user.isAdmin && (
            <Card>
              <h2>Admin Panel</h2>
              <p>Manage messages, approve or reject user messages, and manage users.</p>
              <CardFooter>
                <Link to="/admin">
                  <Button>Enter Admin Panel</Button>
                </Link>
              </CardFooter>
            </Card>
          )}
        </CardsContainer>
      </DashboardContainer>
    </>
  );
};

const DashboardContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
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

const CardsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
`;

const Card = styled.div`
  background-color: var(--bg-secondary);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--shadow-color);
  padding: 1.5rem;
  
  h2 {
    color: var(--accent-color);
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }
  
  p {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
  }
`;

const CardFooter = styled.div`
  margin-top: 1.5rem;
  text-align: center;
`;

const Button = styled.button`
  background-color: var(--accent-color);
  color: var(--text-primary);
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: var(--accent-hover);
  }
`;

const UnreadContainer = styled.div`
  margin: 1rem 0;
  
  h3 {
    font-size: 1rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }
`;

const UnreadList = styled.ul`
  list-style: none;
  padding: 0;
`;

const UnreadItem = styled.li`
  margin-bottom: 0.5rem;
  
  div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    border-radius: 4px;
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    text-decoration: none;
    cursor: pointer;
    
    &:hover {
      background-color: var(--bg-primary);
    }
  }
`;

const UnreadBadge = styled.span`
  background-color: var(--danger-color);
  color: white;
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  border-radius: 50%;
  min-width: 1.5rem;
  text-align: center;
`;

const ConversationsContainer = styled.div`
  margin: 1rem 0;
  
  h3 {
    font-size: 1rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }
`;

const ConversationsList = styled.ul`
  list-style: none;
  padding: 0;
`;

const ConversationItem = styled.li`
  margin-bottom: 0.5rem;
  
  div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    border-radius: 4px;
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    cursor: pointer;
    
    &:hover {
      background-color: var(--bg-primary);
    }
    
    small {
      color: var(--text-secondary);
      font-size: 0.7rem;
    }
  }
`;

const SearchUserForm = styled.form`
  display: flex;
  gap: 0.5rem;
`;

const SearchButton = styled.button`
  background-color: var(--accent-color);
  color: var(--text-primary);
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: var(--accent-hover);
  }
  
  &:disabled {
    background-color: #555;
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const SearchError = styled.div`
  color: var(--danger-color);
  font-size: 0.9rem;
  margin-top: 0.5rem;
`;

const ErrorMessage = styled.div`
  color: var(--danger-color);
  font-size: 0.9rem;
  margin: 0.5rem 0;
  padding: 0.5rem;
  background-color: rgba(231, 76, 60, 0.1);
  border-radius: 4px;
  text-align: center;
`;

const SearchResultsContainer = styled.div`
  margin-top: 1rem;
  text-align: left;
  
  h3 {
    font-size: 1rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }
`;

const SearchResultsList = styled.ul`
  list-style: none;
  padding: 0;
`;

const SearchResultItem = styled.li`
  margin-bottom: 0.5rem;
  
  div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    border-radius: 4px;
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    cursor: pointer;
    
    &:hover {
      background-color: var(--bg-primary);
    }
    
    small {
      color: var(--accent-color);
      font-size: 0.8rem;
    }
  }
`;

export default Dashboard; 
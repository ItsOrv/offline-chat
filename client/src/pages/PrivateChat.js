import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import { SOCKET_URL } from '../config';

const PrivateChat = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [recipientUser, setRecipientUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  
  // Scroll to the bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Initialize socket connection and fetch messages
  useEffect(() => {
    if (!user || !userId) return;

    socketRef.current = io(SOCKET_URL);
    
    // Connect user
    socketRef.current.emit('user_connected', user.id);
    
    // Fetch user info and messages
    const fetchData = async () => {
      try {
        setError('');
        // Fetch recipient user info using the chat route
        const userResponse = await axios.get(`/api/users/chat/${userId}`);
        
        if (userResponse.data.success) {
          setRecipientUser(userResponse.data.user);
          
          // Fetch messages between current user and recipient
          const messagesResponse = await axios.get(`/api/messages/private/${userId}`);
          
          if (messagesResponse.data.success) {
            // Sort messages by creation time (oldest first)
            const sortedMessages = messagesResponse.data.messages.sort(
              (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            );
            setMessages(sortedMessages);
          }
        } else {
          setError('User not found');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error loading data. ' + (error.response?.data?.message || ''));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Cleanup socket connection
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userId, user]);
  
  // Set up socket event listeners
  useEffect(() => {
    if (!socketRef.current || !user || !userId) return;
    
    // Listen for private messages
    socketRef.current.on('receive_private_message', (message) => {
      console.log('Received private message:', message);
      
      // Normalize message format to handle different ID formats
      const normalizedMessage = {
        ...message,
        sender: {
          id: message.sender?.id || message.sender || message.senderId,
          username: message.senderUsername || message.sender?.username
        },
        recipient: {
          id: message.recipient?.id || message.recipient || message.recipientId,
          username: message.recipientUsername || message.recipient?.username
        }
      };
      
      // Only add message if it's from the current chat
      const recipientId = parseInt(userId);
      const senderId = parseInt(normalizedMessage.sender.id);
      const currentUserId = parseInt(user.id);
      
      if ((senderId === recipientId && normalizedMessage.recipient.id === currentUserId) || 
          (senderId === currentUserId && normalizedMessage.recipient.id === recipientId)) {
        setMessages((prevMessages) => [...prevMessages, normalizedMessage]);
      }
    });
    
    // Confirmation that message was sent
    socketRef.current.on('private_message_sent', (message) => {
      console.log('Private message sent:', message);
    });
    
    // Error handling
    socketRef.current.on('message_error', (error) => {
      console.error('Message error:', error);
      setError(error.error || 'Error sending message');
      setTimeout(() => setError(''), 3000);
    });
    
    return () => {
      socketRef.current.off('receive_private_message');
      socketRef.current.off('private_message_sent');
      socketRef.current.off('message_error');
    };
  }, [userId, user]);
  
  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Send a new message
  const sendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || !recipientUser) return;
    
    // Send message through socket
    socketRef.current.emit('send_private_message', {
      sender: user.id,
      recipient: parseInt(userId),
      content: newMessage.trim(),
    });
    
    // Optimistically add message to UI
    const optimisticMessage = {
      id: Date.now().toString(), // Temporary ID
      sender: {
        id: user.id,
        username: user.username,
      },
      recipient: {
        id: parseInt(userId),
        username: recipientUser?.username || 'User',
      },
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, optimisticMessage]);
    
    // Clear input
    setNewMessage('');
  };
  
  // Format message for display
  const formatMessage = (message) => {
    // Normalize IDs to handle different formats
    const senderId = message.sender?.id || message.sender;
    const currentUserId = user.id;
    
    return {
      id: message.id || message._id,
      isOwnMessage: parseInt(senderId) === parseInt(currentUserId),
      content: message.content,
      time: new Date(message.createdAt).toLocaleTimeString(),
    };
  };
  
  if (!user) {
    return <div>Please log in to view this page.</div>;
  }
  
  return (
    <>
      <Navigation />
      <ChatContainer>
        <ChatHeader>
          <BackLink to="/dashboard">« Back to Dashboard</BackLink>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <ErrorMessage>{error}</ErrorMessage>
          ) : (
            <>
              <h2>Chat with {recipientUser?.username}</h2>
            </>
          )}
        </ChatHeader>
        
        <MessagesContainer>
          {loading ? (
            <LoadingMessage>Loading messages...</LoadingMessage>
          ) : error ? (
            <ErrorMessage>{error}</ErrorMessage>
          ) : messages.length === 0 ? (
            <EmptyMessage>No messages yet. Start the conversation!</EmptyMessage>
          ) : (
            messages.map((message) => {
              const formattedMessage = formatMessage(message);
              return (
                <MessageBubble
                  key={formattedMessage.id}
                  isOwnMessage={formattedMessage.isOwnMessage}
                >
                  <MessageContent>{formattedMessage.content}</MessageContent>
                  <MessageTime>{formattedMessage.time}</MessageTime>
                </MessageBubble>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </MessagesContainer>
        
        <MessageForm onSubmit={sendMessage}>
          <MessageInput
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={loading || !!error || !recipientUser}
            autoFocus
          />
          <SendButton type="submit" disabled={loading || !!error || !recipientUser || !newMessage.trim()}>
            Send
          </SendButton>
        </MessageForm>
      </ChatContainer>
    </>
  );
};

const ChatContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  @media (max-width: 600px) {
    max-width: 100vw;
    height: auto;
    min-height: 100vh;
    padding: 0;
  }
`;

const ChatHeader = styled.div`
  padding: 1.5rem;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  @media (max-width: 600px) {
    padding: 1rem 0.5rem;
  }
  h2 {
    margin: 0.5rem 0;
    color: var(--text-primary);
    text-align: center;
    font-size: 1.1rem;
    @media (max-width: 600px) {
      font-size: 1rem;
    }
  }
`;

const BackLink = styled(Link)`
  display: block;
  margin-bottom: 1rem;
  color: var(--accent-color);
  
  &:hover {
    text-decoration: underline;
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background-color: var(--bg-primary);
`;

const LoadingMessage = styled.div`
  text-align: center;
  color: var(--text-secondary);
  margin: 2rem 0;
`;

const ErrorMessage = styled.div`
  text-align: center;
  color: var(--danger-color);
  margin: 1rem 0;
`;

const EmptyMessage = styled.div`
  text-align: center;
  color: var(--text-secondary);
  margin: 2rem 0;
`;

const MessageBubble = styled.div`
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  align-self: ${(props) => (props.isOwnMessage ? 'flex-end' : 'flex-start')};
  background-color: ${(props) =>
    props.isOwnMessage ? 'var(--accent-color)' : 'var(--bg-tertiary)'};
  color: var(--text-primary);
  position: relative;
`;

const MessageContent = styled.div`
  margin-bottom: 0.25rem;
  word-break: break-word;
`;

const MessageTime = styled.div`
  font-size: 0.7rem;
  color: ${(props) =>
    props.isOwnMessage ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-secondary)'};
  text-align: right;
`;

const MessageForm = styled.form`
  display: flex;
  padding: 1rem;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  
  &:focus {
    outline: none;
    border-color: var(--accent-color);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  margin-left: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover:not(:disabled) {
    background-color: var(--accent-hover);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

export default PrivateChat;
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import { SOCKET_URL } from '../config';

const Chat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingMessages, setPendingMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set()); // Track messages being processed
  
  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  
  // Scroll to the bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Initialize socket connection
  useEffect(() => {
    if (!user) return;
    
    // Get the server URL from the proxy or use localhost
    socketRef.current = io(SOCKET_URL);
    
    // Connect user
    socketRef.current.emit('user_connected', user.id);
    
    // Fetch existing messages
    const fetchMessages = async () => {
      try {
        const { data } = await axios.get('/api/messages');
        if (data.success) {
          setMessages(data.messages);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // If user is admin, fetch pending messages
    if (user.isAdmin) {
      const fetchPendingMessages = async () => {
        try {
          const { data } = await axios.get('/api/messages/pending');
          if (data.success) {
            // Create a set of existing pending message IDs to avoid duplicates
            const existingIds = new Set(pendingMessages.map(msg => msg.id || msg._id));
            // Only add new messages that aren't already in the list
            const newPendingMessages = data.messages.filter(
              msg => !existingIds.has(msg.id || msg._id)
            );
            setPendingMessages(prev => [...prev, ...newPendingMessages]);
          }
        } catch (error) {
          console.error('Error fetching pending messages:', error);
        }
      };
      
      fetchPendingMessages();
    }
    
    fetchMessages();
    
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
    
    // Receive approved messages
    socketRef.current.on('approved_message', (message) => {
      console.log('Received approved message:', message);
      setMessages((prevMessages) => {
        // Check if message already exists to avoid duplicates
        const exists = prevMessages.some(
          msg => (msg.id === message.id) || (msg._id === message._id)
        );
        if (exists) return prevMessages;
        return [...prevMessages, message];
      });
      
      // If this is one of the user's pending messages, remove it from pending
      if (message.sender.id === user.id || message.sender._id === user.id) {
        setPendingMessages((prevPending) => 
          prevPending.filter((msg) => msg.id !== message.id && msg._id !== message._id)
        );
      }
      
      // Remove from processing set if it was being processed
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(message.id);
        newSet.delete(message._id);
        return newSet;
      });
    });
    
    // Message was sent for approval
    socketRef.current.on('message_sent_for_approval', (messageId) => {
      console.log('Message sent for approval:', messageId);
    });
    
    // New pending message (admin only)
    if (user.isAdmin) {
      socketRef.current.on('pending_approval', (message) => {
        console.log('New pending message:', message);
        // Check if message already exists in pending list
        setPendingMessages((prevPending) => {
          const exists = prevPending.some(
            msg => (msg.id === message.id) || (msg._id === message._id)
          );
          if (exists) return prevPending;
          return [...prevPending, message];
        });
      });
    }
    
    // Message was rejected (admin only)
    socketRef.current.on('message_rejected', (messageId) => {
      setPendingMessages((prevPending) => 
        prevPending.filter((msg) => msg.id !== messageId && msg._id !== messageId)
      );
      
      // Remove from processing set
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    });
    
    // Online users update
    socketRef.current.on('online_users', (users) => {
      setOnlineUsers(users);
    });
    
    // User disconnected
    socketRef.current.on('user_disconnected', (socketId) => {
      // This could be improved with more information from the server
      console.log('User disconnected:', socketId);
    });
    
    // Error handling
    socketRef.current.on('message_error', (error) => {
      console.error('Message error:', error);
      // Remove all processing IDs on error to allow retry
      setProcessingIds(new Set());
    });
    
    return () => {
      socketRef.current.off('approved_message');
      socketRef.current.off('message_sent_for_approval');
      socketRef.current.off('pending_approval');
      socketRef.current.off('message_rejected');
      socketRef.current.off('online_users');
      socketRef.current.off('user_disconnected');
      socketRef.current.off('message_error');
    };
  }, [user, pendingMessages]);
  
  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Send a new message
  const sendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user) return;
    
    // Send message through socket
    socketRef.current.emit('send_public_message', {
      sender: user.id,
      content: newMessage.trim(),
    });
    
    // Add to pending messages for current user
    const pendingMsg = {
      id: Date.now().toString(), // Temporary ID
      sender: {
        id: user.id,
        username: user.username,
      },
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
      isPending: true, // Custom flag to identify as pending in UI
    };
    
    setPendingMessages((prev) => [...prev, pendingMsg]);
    
    // Clear input
    setNewMessage('');
  };
  
  // Approve a message (admin only)
  const approveMessage = (messageId) => {
    if (!user.isAdmin || !socketRef.current) return;
    
    // Add to processing set to prevent duplicate approvals
    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.add(messageId);
      return newSet;
    });
    
    socketRef.current.emit('approve_message', messageId);
  };
  
  // Reject a message (admin only)
  const rejectMessage = (messageId) => {
    if (!user.isAdmin || !socketRef.current) return;
    
    // Add to processing set to prevent duplicate rejections
    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.add(messageId);
      return newSet;
    });
    
    socketRef.current.emit('reject_message', messageId);
  };
  
  // Navigate to private chat with user
  const goToPrivateChat = (userId) => {
    if (userId === user.id) return; // Don't chat with yourself
    navigate(`/private-chat/${userId}`);
  };
  
  if (!user) {
    return <div>Please log in to view this page.</div>;
  }
  
  return (
    <>
      <Navigation />
      <ChatContainer>
        <ChatSidebar>
          <SidebarSection>
            <h3>Online Users</h3>
            <OnlineUsersList>
              {onlineUsers.map((onlineUser) => (
                <OnlineUser 
                  key={onlineUser.id || onlineUser._id}
                  onClick={() => goToPrivateChat(onlineUser.id || onlineUser._id)}
                  isCurrentUser={(onlineUser.id === user.id) || (onlineUser._id === user._id)}
                >
                  <span>{onlineUser.username}</span>
                  {onlineUser.isAdmin && <AdminBadge>Admin</AdminBadge>}
                  {(onlineUser.id !== user.id) && (onlineUser._id !== user._id) && (
                    <ChatButton title="Start private chat">Chat</ChatButton>
                  )}
                </OnlineUser>
              ))}
            </OnlineUsersList>
          </SidebarSection>
          
          {user.isAdmin && pendingMessages.length > 0 && (
            <SidebarSection>
              <h3>Messages Awaiting Approval</h3>
              <PendingMessagesList>
                {pendingMessages.map((message) => {
                  const messageId = message.id || message._id;
                  const isProcessing = processingIds.has(messageId);
                  
                  return (
                    <PendingMessage key={messageId}>
                      <PendingMessageHeader>
                        <span>{message.sender?.username || message.senderUsername || 'User'}</span>
                        <PendingTime>
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </PendingTime>
                      </PendingMessageHeader>
                      <PendingMessageContent>{message.content}</PendingMessageContent>
                      <PendingMessageActions>
                        <ApproveButton 
                          onClick={() => approveMessage(messageId)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Processing...' : 'Approve'}
                        </ApproveButton>
                        <RejectButton 
                          onClick={() => rejectMessage(messageId)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Processing...' : 'Reject'}
                        </RejectButton>
                      </PendingMessageActions>
                    </PendingMessage>
                  );
                })}
              </PendingMessagesList>
            </SidebarSection>
          )}
        </ChatSidebar>
        
        <ChatMain>
          <ChatHeader>
            <h2>Public Chatroom</h2>
            <p>Messages will be displayed after admin approval.</p>
          </ChatHeader>
          
          <MessagesContainer>
            {loading ? (
              <LoadingMessage>Loading messages...</LoadingMessage>
            ) : messages.length === 0 ? (
              <EmptyMessage>No messages have been sent yet.</EmptyMessage>
            ) : (
              messages.map((message) => {
                const isOwnMessage = (message.sender.id === user.id) || (message.sender._id === user.id);
                return (
                  <MessageBubble
                    key={message.id || message._id}
                    isOwnMessage={isOwnMessage}
                  >
                    <MessageHeader>
                      <MessageSender 
                        onClick={() => goToPrivateChat(message.sender.id || message.sender._id)}
                        isClickable={!isOwnMessage}
                      >
                        {message.sender.username || message.senderUsername}
                      </MessageSender>
                      <MessageTime>
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </MessageTime>
                    </MessageHeader>
                    <MessageContent>{message.content}</MessageContent>
                  </MessageBubble>
                );
              })
            )}
            
            {/* Show user's pending messages */}
            {pendingMessages
              .filter((message) => (message.sender.id === user.id) || (message.sender._id === user.id))
              .map((message) => (
                <MessageBubble key={message.id || message._id} isOwnMessage isPending>
                  <MessageHeader>
                    <MessageSender>{message.sender.username || message.senderUsername}</MessageSender>
                    <MessageTime>
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </MessageTime>
                  </MessageHeader>
                  <MessageContent>{message.content}</MessageContent>
                  <PendingIndicator>Awaiting Approval</PendingIndicator>
                </MessageBubble>
              ))}
            
            <div ref={messagesEndRef} />
          </MessagesContainer>
          
          <MessageForm onSubmit={sendMessage}>
            <MessageInput
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              autoFocus
            />
            <SendButton type="submit" disabled={!newMessage.trim()}>Send</SendButton>
          </MessageForm>
        </ChatMain>
      </ChatContainer>
    </>
  );
};

const ChatContainer = styled.div`
  display: flex;
  height: calc(100vh - 60px);
  max-width: 1400px;
  margin: 0 auto;
  background-color: var(--bg-primary);
`;

const ChatSidebar = styled.div`
  width: 300px;
  background-color: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const SidebarSection = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  
  h3 {
    margin-bottom: 1rem;
    font-size: 1rem;
    color: var(--text-primary);
  }
`;

const OnlineUsersList = styled.ul`
  list-style: none;
  padding: 0;
`;

const OnlineUser = styled.li`
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background-color: var(--bg-tertiary);
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-secondary);
  cursor: ${props => props.isCurrentUser ? 'default' : 'pointer'};
  
  &:hover {
    background-color: ${props => props.isCurrentUser ? 'var(--bg-tertiary)' : 'var(--bg-primary)'};
  }
`;

const ChatButton = styled.button`
  background-color: var(--accent-color);
  color: var(--text-primary);
  border: none;
  border-radius: 4px;
  padding: 0.2rem 0.4rem;
  font-size: 0.7rem;
  cursor: pointer;
  
  &:hover {
    background-color: var(--accent-hover);
  }
`;

const AdminBadge = styled.span`
  background-color: var(--danger-color);
  color: var(--text-primary);
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
`;

const PendingMessagesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
`;

const PendingMessage = styled.div`
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 1rem;
`;

const PendingMessageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  
  span {
    font-weight: 500;
    color: var(--text-primary);
  }
`;

const PendingTime = styled.span`
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const PendingMessageContent = styled.p`
  margin-bottom: 1rem;
  color: var(--text-secondary);
`;

const PendingMessageActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
`;

const ApproveButton = styled.button`
  background-color: var(--success-color);
  color: var(--text-primary);
  border: none;
  border-radius: 4px;
  padding: 0.5rem 0.8rem;
  font-size: 0.8rem;
  cursor: pointer;
  
  &:hover:not(:disabled) {
    background-color: #27ae60;
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const RejectButton = styled.button`
  background-color: var(--danger-color);
  color: var(--text-primary);
  border: none;
  border-radius: 4px;
  padding: 0.5rem 0.8rem;
  font-size: 0.8rem;
  cursor: pointer;
  
  &:hover:not(:disabled) {
    background-color: #c0392b;
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const ChatMain = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ChatHeader = styled.div`
  padding: 1.5rem;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  text-align: center;
  
  h2 {
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }
  
  p {
    color: var(--text-secondary);
    font-size: 0.9rem;
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

const EmptyMessage = styled.div`
  text-align: center;
  color: var(--text-secondary);
  margin: 2rem 0;
`;

const MessageBubble = styled.div`
  max-width: 70%;
  padding: 1rem;
  border-radius: 8px;
  background-color: ${(props) => (props.isOwnMessage ? 'var(--accent-color)' : 'var(--bg-secondary)')};
  color: ${(props) => (props.isOwnMessage ? 'var(--text-primary)' : 'var(--text-primary)')};
  align-self: ${(props) => (props.isOwnMessage ? 'flex-end' : 'flex-start')};
  box-shadow: 0 1px 2px var(--shadow-color);
  opacity: ${(props) => (props.isPending ? 0.7 : 1)};
  position: relative;
`;

const MessageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const MessageSender = styled.span`
  font-weight: 500;
  cursor: ${props => props.isClickable ? 'pointer' : 'default'};
  
  &:hover {
    text-decoration: ${props => props.isClickable ? 'underline' : 'none'};
    color: ${props => props.isClickable ? 'var(--accent-color)' : 'inherit'};
  }
`;

const MessageTime = styled.span`
  font-size: 0.8rem;
  opacity: 0.8;
`;

const MessageContent = styled.p`
  word-break: break-word;
`;

const PendingIndicator = styled.div`
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
  text-align: right;
  font-style: italic;
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
  border-radius: 4px 0 0 4px;
  font-size: 1rem;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  
  &:focus {
    outline: none;
    border-color: var(--accent-color);
  }
`;

const SendButton = styled.button`
  background-color: var(--accent-color);
  color: var(--text-primary);
  border: none;
  border-radius: 0 4px 4px 0;
  padding: 0 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  
  &:hover {
    background-color: var(--accent-hover);
  }
  
  &:disabled {
    background-color: #555;
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

export default Chat; 
import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect, useRef } from 'react';

import './Messages.css';

interface Contact {
  _id: string;
  name: string;
  role: string;
}

interface MessageData {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

const Messages: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messageInput, setMessageInput] = useState('');
  
  const [toast, setToast] = useState<{message: string, visible: boolean}>({ message: '', visible: false });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;

  // Fetch contacts on mount
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('${API_BASE_URL}/api/messages/contacts', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setContacts(data);
          setFilteredContacts(data);
        }
      } catch (error) {
        console.error('Failed to fetch contacts', error);
      }
    };
    fetchContacts();
  }, []);

  // Filter contacts locally
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      setFilteredContacts(
        contacts.filter(c => c.name.toLowerCase().includes(lowerQuery) || c.role.toLowerCase().includes(lowerQuery))
      );
    }
  }, [searchQuery, contacts]);

  // Fetch conversation when active contact changes
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const fetchConversation = async () => {
      if (!activeContact) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/messages/${activeContact._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(prev => {
            if (prev.length > 0 && data.length > prev.length) {
              const newMsgs = data.slice(prev.length);
              const latestMsg = newMsgs[newMsgs.length - 1];
              if (latestMsg.senderId !== currentUser?.id) {
                setToast({ message: `New message from ${activeContact.name || 'User'}`, visible: true });
                setTimeout(() => setToast({ message: '', visible: false }), 4000);
              }
            }
            return data;
          });
        }
      } catch (error) {
        console.error('Failed to fetch conversation', error);
      }
    };

    if (activeContact) {
      fetchConversation();
      // Basic polling for new messages every 3 seconds
      interval = setInterval(fetchConversation, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeContact]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeContact) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/messages/${activeContact._id}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: messageInput })
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessages(prev => [...prev, newMessage]);
        setMessageInput('');
      }
    } catch (error) {
      console.error('Failed to send message', error);
    }
  };

  const formatRole = (role: string) => {
    if (role === 'SUPER_ADMIN') return 'Super Admin';
    if (role === 'ADMIN') return 'Admin';
    if (role === 'USER') return 'User';
    return role;
  };

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  return (
    <div className="messages-page">
      <div className="messages-container" style={{ position: 'relative' }}>
        
        {/* Toast Notification */}
        {toast.visible && (
          <div style={{
            position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 1000,
            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500,
            animation: 'fadeInOut 4s forwards'
          }}>
            <span>💬</span> {toast.message}
          </div>
        )}
        
        {/* Left Pane - Contacts */}
        <div className="contacts-pane">
          <div className="contacts-header">
            <h3>Chat Contacts</h3>
          </div>
          
          <div className="contacts-search">
            <div className="search-input-wrapper">
              <input 
                type="text" 
                placeholder="Search contacts..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="contacts-list">
            {filteredContacts.map(contact => (
              <div 
                key={contact._id} 
                className={`contact-item ${activeContact?._id === contact._id ? 'active' : ''}`}
                onClick={() => setActiveContact(contact)}
              >
                <div className="contact-avatar">
                  {getInitial(contact.name || formatRole(contact.role))}
                </div>
                <div className="contact-info">
                  <span className="contact-name">{contact.name || formatRole(contact.role)}</span>
                  {contact.name && <span className="contact-role">{formatRole(contact.role)}</span>}
                </div>
              </div>
            ))}
            {filteredContacts.length === 0 && (
              <div className="no-contacts">No contacts found</div>
            )}
          </div>
        </div>

        {/* Right Pane - Active Chat */}
        <div className="chat-pane">
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="contact-avatar">
                  {getInitial(activeContact.name || formatRole(activeContact.role))}
                </div>
                <div className="contact-info">
                  <span className="contact-name">{activeContact.name || formatRole(activeContact.role)}</span>
                  {activeContact.name && <span className="contact-role">{formatRole(activeContact.role)}</span>}
                </div>
              </div>

              {/* Chat Messages */}
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="no-messages">
                    Send a message to start the conversation with {activeContact.name || formatRole(activeContact.role)}
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.senderId === currentUser?.id;
                    return (
                      <div key={msg._id} className={`message-bubble-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                        <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
                          {msg.content}
                        </div>
                        <div className="message-time">
                          {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="chat-input-area">
                <form onSubmit={handleSendMessage} className="chat-form">
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                  />
                  <button type="submit" className="send-btn" disabled={!messageInput.trim()}>
                    Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="empty-chat-state">
              <div className="empty-chat-content">
                Select a contact from the left panel to start messaging.
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default Messages;

// src/pages/DashboardPage.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';

function DashboardPage() {
  const [emails, setEmails] = useState([]);
  const [authenticatedEmails, setAuthenticatedEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);

  useEffect(() => {
    // Fetch authenticated Gmail accounts for the user from MongoDB
    axios.get('/api/authenticated-emails').then((res) => setAuthenticatedEmails(res.data));
  }, []);

  const handleEmailSelect = (email) => {
    setSelectedEmail(email);
    // Fetch unread emails for the selected account
    axios.get(`/api/emails?email=${email}`).then((res) => setEmails(res.data));
  };

  const handleLogout = () => {
    // Log out user and clear session
    axios.post('/api/logout');
    window.location.href = '/login'; // Redirect to login page
  };

  return (
    <div>
      <div style={{ float: 'left', width: '200px' }}>
        <h3>Authenticated Accounts</h3>
        <button onClick={handleLogout}>Logout</button>
        {authenticatedEmails.map((email) => (
          <div key={email} onClick={() => handleEmailSelect(email)}>
            <img src="google-icon.png" alt="Gmail" /> {email}
          </div>
        ))}
      </div>
      
      <div style={{ marginLeft: '220px' }}>
        <h3>Unread Emails</h3>
        {emails.map((email) => (
          <div key={email.id}>
            <h4>{email.subject}</h4>
            <p>{email.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;

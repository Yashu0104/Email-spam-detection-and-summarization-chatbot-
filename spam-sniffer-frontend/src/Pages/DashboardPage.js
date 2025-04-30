import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiRefreshCw, FiTrash2 } from 'react-icons/fi';

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

function DashboardPage() {
  const [authenticatedEmails, setAuthenticatedEmails] = useState([]);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);

  const token = localStorage.getItem('token');
  const userEmail = localStorage.getItem('userEmail');

  useEffect(() => {
    if (!token) {
      window.location.href = '/login';
      return;
    }
    fetchAuthenticatedEmails();
  }, []);

  const fetchAuthenticatedEmails = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/authenticated-emails`, {
        params: { email: userEmail },
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setAuthenticatedEmails(res.data);
    } catch (err) {
      console.error('Error fetching authenticated emails:', err);
    }
  };

  const handleEmailSelect = async (email) => {
    setSelectedEmail(email);
    try {
      const res = await axios.get(`${API_BASE}/api/emails`, {
        params: { email },
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setEmails(res.data);
    } catch (err) {
      console.error('Error fetching emails:', err);
    }
  };

  const handleAddGmail = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/google-auth-url`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      // Redirect the browser to Google OAuth URL (CORS-safe)
      window.location.href = res.data.authUrl;
    } catch (err) {
      console.error('Error initiating OAuth:', err);
      alert("Google sign-in failed.");
    }
  };

  const handleRemoveEmail = async (gmail) => {
    try {
      await axios.post(
        `${API_BASE}/api/remove-gmail`,
        { email: userEmail, gmail },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      fetchAuthenticatedEmails();
      if (selectedEmail === gmail) setEmails([]);
    } catch (err) {
      console.error('Error removing Gmail:', err);
    }
  };

  const handleRefreshEmail = (gmail) => {
    handleEmailSelect(gmail);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      {/* Sidebar */}
      <aside className="w-72 bg-white shadow-md p-4 border-r">
        <h2 className="text-2xl font-bold mb-6">Your Gmail Accounts</h2>
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-6 transition-all"
          onClick={handleAddGmail}
        >
          <img src="/google-icon.png" alt="G" className="w-5 h-5" />
          Add Gmail
        </button>

        <div className="space-y-2">
          {authenticatedEmails.map((gmail) => (
            <div
              key={gmail}
              className={`group flex justify-between items-center px-3 py-2 rounded cursor-pointer hover:bg-blue-100 ${
                gmail === selectedEmail ? 'bg-blue-50 font-semibold' : ''
              }`}
              onClick={() => handleEmailSelect(gmail)}
            >
              <span>{gmail}</span>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <FiRefreshCw
                  className="text-blue-500 hover:text-blue-700 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefreshEmail(gmail);
                  }}
                />
                <FiTrash2
                  className="text-red-500 hover:text-red-700 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveEmail(gmail);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Email Viewer */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Unread Emails</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        {emails.length === 0 ? (
          <p className="text-gray-500">No emails to show.</p>
        ) : (
          <div className="grid gap-4">
            {emails.map((email) => (
              <div
                key={email.id}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition"
              >
                <h3 className="font-bold text-lg mb-1">{email.subject || 'No Subject'}</h3>
                <p className="text-gray-700">{email.snippet}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default DashboardPage;

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { gapi } from 'gapi-script';

const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
const API_KEY = process.env.REACT_APP_API_KEY;
const SCOPES = process.env.REACT_APP_SCOPES;

function GmailClient() {
  const [emails, setEmails] = useState([]);
  const [spamResults, setSpamResults] = useState({});
  const [user, setUser] = useState(null); // 👤 Store user info

  useEffect(() => {
    function start() {
      gapi.client
        .init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          scope: SCOPES,
          discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"],
        })
        .then(() => {
          console.log("GAPI client initialized");
        })
        .catch((error) => {
          console.error("Error initializing GAPI client", error);
        });
    }

    gapi.load("client:auth2", start);
  }, []);

  const handleLogin = async () => {
    try {
      const authInstance = gapi.auth2.getAuthInstance();
      const googleUser = await authInstance.signIn();
      const profile = googleUser.getBasicProfile();

      setUser({
        name: profile.getName(),
        email: profile.getEmail(),
      });

      console.log("Signed in!", profile.getName());

      if (!gapi.client.gmail) {
        await gapi.client.load("gmail", "v1");
        console.log("Gmail API loaded");
      }

      loadEmails();
    } catch (error) {
      console.error("Error during login or Gmail API loading", error);
    }
  };

  const handleLogout = () => {
    const authInstance = gapi.auth2.getAuthInstance();
    authInstance.disconnect().then(() => {
      console.log("User signed out and disconnected.");
      setEmails([]);
      setSpamResults({});
      setUser(null);
    });
  };

  const loadEmails = async () => {
    if (!gapi.client.gmail || !gapi.client.gmail.users) {
      console.error("Gmail API not loaded yet.");
      return;
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const after = Math.floor(startOfDay.getTime() / 1000);
    const before = Math.floor(endOfDay.getTime() / 1000);

    const query = `is:unread after:${after} before:${before}`;

    try {
      const response = await gapi.client.gmail.users.messages.list({
        userId: "me",
        q: query,
      });

      if (response.result.messages) {
        const messages = response.result.messages;
        const emailDetails = await Promise.all(
          messages.map(async (message) => {
            const email = await gapi.client.gmail.users.messages.get({
              userId: "me",
              id: message.id,
              format: "full",
            });
            return email.result;
          })
        );

        setEmails(emailDetails);
      } else {
        setEmails([]);
        console.log("No unread emails found for today.");
      }
    } catch (error) {
      console.error("Error fetching emails", error);
    }
  };

  const checkSpam = async (emailId, emailBody) => {
    try {
      const res = await axios.post("http://localhost:5000/check_spam", {
        text: emailBody,
      });

      setSpamResults((prevResults) => ({
        ...prevResults,
        [emailId]: res.data,
      }));
    } catch (error) {
      console.error("Error checking spam:", error);
    }
  };

  const markAsRead = async (emailId) => {
    try {
      await gapi.client.gmail.users.messages.modify({
        userId: "me",
        id: emailId,
        removeLabelIds: ["UNREAD"],
      });
      setEmails((prev) => prev.filter((email) => email.id !== emailId));
      console.log("Email marked as read:", emailId);
    } catch (error) {
      console.error("Error marking email as read:", error);
    }
  };

  const deleteEmail = async (emailId) => {
    try {
      await gapi.client.gmail.users.messages.trash({
        userId: "me",
        id: emailId,
      });
      setEmails((prevEmails) => prevEmails.filter((email) => email.id !== emailId));
      console.log("Email moved to trash:", emailId);
    } catch (error) {
      console.error("Error trashing email:", error);
      alert("Failed to delete email: " + (error?.result?.error?.message || "Unknown error"));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6 relative">
      {/* 👤 Top-right user info */}
      {user && (
        <div className="absolute top-4 right-4 bg-white shadow-md px-4 py-2 rounded-lg text-sm text-gray-800 transition-all duration-300 ease-in-out">
          <p className="font-semibold">{user.name}</p>
          <p className="text-xs text-gray-600">{user.email}</p>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-blue-800 text-center">📬 Email Spam Detector</h2>

        {/* 🔘 Control Buttons */}
        <div className="flex gap-4 justify-center mb-8">
          <button onClick={handleLogin} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-all">
            Login with Gmail
          </button>
          <button onClick={handleLogout} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-md transition-all">
            Logout
          </button>
          <button onClick={loadEmails} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md transition-all">
            Refresh Emails
          </button>
        </div>

        {/* 📧 Emails List */}
        {emails.length > 0 ? (
          <div className="space-y-6">
            <h4 className="text-xl font-semibold text-gray-700">Today's Unread Emails:</h4>
            {emails.map((email) => {
              const spamResult = spamResults[email.id];
              const from = email.payload.headers.find((h) => h.name === "From")?.value;
              const subject = email.payload.headers.find((h) => h.name === "Subject")?.value;

              return (
                <div
                  key={email.id}
                  className="bg-white rounded-xl shadow-md p-4 transition-transform transform hover:scale-[1.01] hover:shadow-lg"
                >
                  <h5 className="text-md font-semibold text-gray-800">{from}</h5>
                  <p className="text-sm text-gray-600 mb-2"><strong>Subject:</strong> {subject}</p>
                  <pre className="text-sm text-gray-700 bg-gray-100 p-2 rounded overflow-auto">{email.snippet}</pre>

                  <div className="flex gap-3 mt-3">
                    <button onClick={() => checkSpam(email.id, email.snippet)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded transition">
                      Check for Spam
                    </button>
                    <button onClick={() => markAsRead(email.id)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition">
                      Mark as Read
                    </button>
                    <button onClick={() => deleteEmail(email.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition">
                      Delete Email
                    </button>
                  </div>

                  {spamResult && (
                    <div className="mt-4 bg-gray-50 border-l-4 border-yellow-400 p-3 rounded-md animate-fade-in">
                      <p><strong>Spam?</strong> {spamResult.is_spam ? '✅ Yes' : '❌ No'}</p>
                      <p><strong>Spam Score:</strong> {spamResult.spam_score}</p>
                      <p><strong>Type:</strong> {spamResult.description}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-600 mt-6">No unread emails found for today.</p>
        )}
      </div>
    </div>
  );
}

export default GmailClient;

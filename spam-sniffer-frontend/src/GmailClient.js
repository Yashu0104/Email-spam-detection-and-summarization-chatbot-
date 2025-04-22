import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { gapi } from 'gapi-script';
import { motion } from 'framer-motion';

const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
const API_KEY = process.env.REACT_APP_API_KEY;
const SCOPES = process.env.REACT_APP_SCOPES;

function GmailClient() {
  const [emails, setEmails] = useState([]);
  const [spamResults, setSpamResults] = useState({});

  useEffect(() => {
    function start() {
      gapi.client
        .init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          scope: SCOPES,
          discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"],
        })
        .then(() => console.log("GAPI initialized"))
        .catch((error) => console.error("GAPI init error", error));
    }

    gapi.load("client:auth2", start);
  }, []);

  const handleLogin = async () => {
    try {
      const authInstance = gapi.auth2.getAuthInstance();
      await authInstance.signIn();

      if (!gapi.client.gmail) await gapi.client.load("gmail", "v1");
      loadEmails();
    } catch (error) {
      console.error("Login error", error);
    }
  };

  const handleLogout = () => {
    const authInstance = gapi.auth2.getAuthInstance();
    authInstance.disconnect().then(() => {
      setEmails([]);
      setSpamResults({});
    });
  };

  const loadEmails = async () => {
    const now = new Date();
    const after = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()) / 1000);
    const before = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59) / 1000);

    const query = `is:unread after:${after} before:${before}`;

    try {
      const response = await gapi.client.gmail.users.messages.list({ userId: "me", q: query });
      if (response.result.messages) {
        const emailDetails = await Promise.all(
          response.result.messages.map(async (message) => {
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
      }
    } catch (error) {
      console.error("Error loading emails", error);
    }
  };

  const checkSpam = async (emailId, emailBody) => {
    try {
      const res = await axios.post("http://localhost:5000/check_spam", { text: emailBody });
      setSpamResults((prev) => ({ ...prev, [emailId]: res.data }));
    } catch (error) {
      console.error("Spam check failed", error);
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
    } catch (error) {
      console.error("Error marking as read", error);
    }
  };

  const deleteEmail = async (emailId) => {
    try {
      await gapi.client.gmail.users.messages.trash({
        userId: "me",
        id: emailId,
      });
      setEmails((prevEmails) => prevEmails.filter((email) => email.id !== emailId));
    } catch (error) {
      console.error("Delete error", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-6">📩 Gmail Spam Detector</h2>

        <div className="flex justify-center gap-4 mb-6">
          <button onClick={handleLogin} className="btn-primary">Login</button>
          <button onClick={handleLogout} className="btn-secondary">Logout</button>
          <button onClick={loadEmails} className="btn-secondary">Refresh</button>
        </div>

        {emails.length > 0 ? (
          <div className="space-y-6">
            {emails.map((email) => {
              const spamResult = spamResults[email.id];
              const from = email.payload.headers.find(h => h.name === "From")?.value;
              const subject = email.payload.headers.find(h => h.name === "Subject")?.value;

              return (
                <motion.div
                  key={email.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-white shadow-md p-4 rounded-xl"
                >
                  <p className="text-sm text-gray-500 mb-1">{from}</p>
                  <h3 className="text-lg font-semibold">{subject}</h3>
                  <p className="text-gray-700 my-2">{email.snippet}</p>

                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button onClick={() => checkSpam(email.id, email.snippet)} className="btn-sm btn-outline">Check Spam</button>
                    <button onClick={() => markAsRead(email.id)} className="btn-sm btn-green">Mark Read</button>
                    <button onClick={() => deleteEmail(email.id)} className="btn-sm btn-red">Delete</button>
                  </div>

                  {spamResult && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="bg-gray-50 p-3 mt-4 rounded-lg border"
                    >
                      <p><strong>Spam:</strong> {spamResult.is_spam ? "✅ Yes" : "❌ No"}</p>
                      <p><strong>Spam Score:</strong> {spamResult.spam_score}</p>
                      <p><strong>Type:</strong> {spamResult.description}</p>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500">No unread emails for today.</p>
        )}
      </div>
    </div>
  );
}

export default GmailClient;

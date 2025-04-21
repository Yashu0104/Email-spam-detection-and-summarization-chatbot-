import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { gapi } from 'gapi-script';

const CLIENT_ID = "229454454543-55trdqt3mdn401515uvkr7fevv62kvua.apps.googleusercontent.com";
const API_KEY = "AIzaSyAe4RTmtgBN7T-ijI8FQ-t9fClV52ko0h8";
const SCOPES = "https://www.googleapis.com/auth/gmail.modify";


function GmailClient() {
  const [emails, setEmails] = useState([]);
  const [result, setResult] = useState(null);

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
      await authInstance.signIn();
      console.log("Signed in!");

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

  const checkSpam = async (emailBody) => {
    try {
      const res = await axios.post("http://localhost:5000/check_spam", {
        text: emailBody,
      });
      setResult(res.data);
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
    <div>
      <h2>Gmail Spam Detector</h2>
      <button onClick={handleLogin}>Login with Gmail</button>
      <button onClick={handleLogout}>Logout</button>
      <button onClick={loadEmails}>Refresh Emails</button>

      {emails.length > 0 && (
        <div>
          <h4>Today's Unread Emails:</h4>
          {emails.map((email, index) => (
            <div key={index} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
              <h5>{email.payload.headers.find((header) => header.name === "From")?.value}</h5>
              <p><strong>Subject:</strong> {email.payload.headers.find((header) => header.name === "Subject")?.value}</p>
              <pre>{email.snippet}</pre>
              <button onClick={() => checkSpam(email.snippet)}>Check for Spam</button>
              <button onClick={() => markAsRead(email.id)}>Mark as Read</button>
              <button onClick={() => deleteEmail(email.id)}>Delete Email</button>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div style={{ backgroundColor: "#f0f0f0", padding: "10px", marginTop: "10px" }}>
          <p><strong>Spam?</strong> {result.is_spam ? 'Yes' : 'No'}</p>
          <p><strong>Spam Score:</strong> {result.spam_score}</p>
          <p><strong>Type:</strong> {result.description}</p>
        </div>
      )}
    </div>
  );
}

export default GmailClient;

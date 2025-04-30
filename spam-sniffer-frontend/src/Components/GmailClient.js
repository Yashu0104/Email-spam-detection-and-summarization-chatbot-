import React, { useEffect, useState } from "react";
import axios from "axios";
import { gapi } from "gapi-script";

const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
const API_KEY = process.env.REACT_APP_API_KEY;
const SCOPES = process.env.REACT_APP_SCOPES;

function GmailClient({ gmail }) {
  const [emails, setEmails] = useState([]);
  const [spamResults, setSpamResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState({ name: gmail, email: gmail }); // placeholder since no profile info
  const appUser = localStorage.getItem("userEmail");

  useEffect(() => {
    function start() {
      gapi.client
        .init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          scope: SCOPES,
          discoveryDocs: [
            "https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest",
          ],
        })
        .then(() => {
          console.log("GAPI initialized");
          loadEmails(); // Load emails immediately for selected account
        })
        .catch((error) => {
          console.error("GAPI init failed", error);
        });
    }

    gapi.load("client:auth2", start);
  }, [gmail]);

  const loadEmails = async () => {
    if (!gapi.client.gmail?.users) {
      console.error("Gmail API not ready");
      return;
    }

    const now = new Date();
    const after = Math.floor(new Date(now.setHours(0, 0, 0)).getTime() / 1000);
    const before = Math.floor(
      new Date(now.setHours(23, 59, 59)).getTime() / 1000
    );

    try {
      setLoading(true);
      const response = await gapi.client.gmail.users.messages.list({
        userId: "me",
        q: `is:unread after:${after} before:${before}`,
      });

      const messageList = response.result.messages || [];
      const emailDetails = await Promise.all(
        messageList.map(async (msg) => {
          const email = await gapi.client.gmail.users.messages.get({
            userId: "me",
            id: msg.id,
            format: "full",
          });
          return email.result;
        })
      );

      setEmails(emailDetails);
    } catch (err) {
      console.error("Error fetching emails", err);
    } finally {
      setLoading(false);
    }
  };

  const checkSpam = async (emailId, emailBody) => {
    try {
      const res = await axios.post("http://localhost:5000/check_spam", {
        text: emailBody,
      });

      setSpamResults((prev) => ({
        ...prev,
        [emailId]: res.data,
      }));
    } catch (error) {
      console.error("Spam check failed:", error);
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
      console.error("Mark as read failed:", error);
    }
  };

  const deleteEmail = async (emailId) => {
    try {
      await gapi.client.gmail.users.messages.trash({
        userId: "me",
        id: emailId,
      });
      setEmails((prev) => prev.filter((email) => email.id !== emailId));
    } catch (error) {
      console.error("Email delete failed:", error);
      alert(
        "Failed to delete email: " + (error?.result?.error?.message || "Unknown")
      );
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 p-6 relative">
      {user && (
        <div className="absolute top-4 right-4 bg-white px-4 py-2 shadow rounded text-sm">
          <p className="font-bold">{user.name}</p>
          <p className="text-xs">{user.email}</p>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-blue-800 mb-6">
          📬 Email Spam Detector
        </h2>

        <div className="flex justify-end gap-4 mb-4">
          <button
            onClick={loadEmails}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            Refresh
          </button>
        </div>

        {loading && (
          <p className="text-center text-gray-500">Loading emails...</p>
        )}

        {emails.length > 0 ? (
          <div className="space-y-6">
            {emails.map((email) => {
              const spamResult = spamResults[email.id];
              const from = email.payload.headers.find(
                (h) => h.name === "From"
              )?.value;
              const subject = email.payload.headers.find(
                (h) => h.name === "Subject"
              )?.value;

              return (
                <div
                  key={email.id}
                  className="bg-white p-4 shadow rounded-md"
                >
                  <h4 className="text-md font-semibold">{from}</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Subject:</strong> {subject}
                  </p>
                  <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                    {email.snippet}
                  </pre>

                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => checkSpam(email.id, email.snippet)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                    >
                      Check Spam
                    </button>
                    <button
                      onClick={() => markAsRead(email.id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Mark as Read
                    </button>
                    <button
                      onClick={() => deleteEmail(email.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>

                  {spamResult && (
                    <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-md">
                      <p>
                        <strong>Spam?</strong>{" "}
                        {spamResult.is_spam ? "✅ Yes" : "❌ No"}
                      </p>
                      <p>
                        <strong>Spam Score:</strong> {spamResult.spam_score}
                      </p>
                      <p>
                        <strong>Type:</strong> {spamResult.description}
                      </p>
                      <p>
                        <strong>Summary:</strong> {spamResult.summary}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : !loading ? (
          <p className="text-center text-gray-500">
            No unread emails found for today.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default GmailClient;

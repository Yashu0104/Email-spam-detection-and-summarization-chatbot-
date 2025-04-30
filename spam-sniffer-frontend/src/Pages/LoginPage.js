import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const axiosConfig = {
    withCredentials: true,
    headers: {
      "Content-Type": "application/json"
    }
  };

  const handleSignup = async () => {
    try {
      const res = await axios.post(
        `${API_BASE}/api/signup`,
        { email, password },
        axiosConfig
      );
      alert("Signup successful!");
    } catch (err) {
      console.error("Signup Error:", err);
      alert(err.response?.data?.error || "Signup failed");
    }
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post(
        `${API_BASE}/api/login`,
        { email, password },
        axiosConfig
      );
      alert("Login successful!");

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userEmail", email);

      navigate("/dashboard");
    } catch (err) {
      console.error("Login Error:", err);
      alert(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Spam-Sniffer Email Spam Detection App</h1>
      <input
        className="border p-2 m-2 rounded"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="border p-2 m-2 rounded"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex gap-4 mt-4">
        <button onClick={handleSignup} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
          Sign Up
        </button>
        <button onClick={handleLogin} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
          Sign In
        </button>
      </div>
    </div>
  );
};

export default LoginPage;

// src/pages/LoginPage.js

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); // Toggle between login and signup
  const history = useHistory();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/login' : '/api/signup';
    try {
      const res = await axios.post(endpoint, { email, password });
      console.log(res.data); // User logged in / signed up
      // Redirect to dashboard page
      history.push('/dashboard');
    } catch (error) {
      console.error(error);
      alert('Error during login/signup');
    }
  };

  return (
    <div>
      <h2>Spam-Sniffer Email-Spam Detection App</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">{isLogin ? 'Login' : 'Sign Up'}</button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? 'Don’t have an account? Sign Up' : 'Already have an account? Login'}
      </button>
    </div>
  );
}

export default LoginPage;

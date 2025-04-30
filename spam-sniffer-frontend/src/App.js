// src/App.js

import React from 'react';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LoginPage from './Pages/LoginPage';
import DashboardPage from './Pages/DashboardPage';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* Other routes */}
      </Routes>
    </Router>
  );
};

export default App;

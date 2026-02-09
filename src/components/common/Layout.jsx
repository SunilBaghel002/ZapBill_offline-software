import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../layout/Sidebar';
import TopNav from '../layout/TopNav';

const Layout = () => {
  const navigate = useNavigate();

  const handleNewOrder = () => {
    navigate('/pos');
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <TopNav onNewOrder={handleNewOrder} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

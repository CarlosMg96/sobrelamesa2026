import React from 'react';
import { Outlet } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const PublicLayout = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Theme Toggle flotante discreto */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 20,
          zIndex: 1200,
        }}
      >
        <ThemeToggle />
      </div>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;
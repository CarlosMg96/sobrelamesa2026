import { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, CssBaseline, Toolbar, useTheme } from '@mui/material';
import Navbar from './Navbar';
import Sidebar from './Sidebar/Sidebar';
import Footer from './Footer';
import { useAuth } from '../../../../modules/auth/hooks/useAuth';

const drawerWidth = 240;

const PrivateLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();
  const theme = useTheme();

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(!mobileOpen);
  }, [mobileOpen]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  // No mostrar el layout en la ruta de cotización
  if (location.pathname === '/events/quote') {
    return <Outlet />;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <CssBaseline />
      
      {/* Navbar */}
      <Navbar 
        drawerWidth={drawerWidth} 
        handleDrawerToggle={handleDrawerToggle} 
      />
      
      {/* Sidebar */}
      <Sidebar 
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        drawerWidth={drawerWidth}
        handleLogout={handleLogout}
      />
      
      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          mt: { xs: 8, sm: 0 },
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100vh - 64px)', // Ajusta según la altura del Navbar
        }}
      >
        <Toolbar /> {/* Espacio para el AppBar fijo */}
        <Box sx={{ flexGrow: 1 }}>
          <Outlet />
        </Box>
        
        {/* Footer */}
        <Footer />
      </Box>
    </Box>
  );
};

export default PrivateLayout;

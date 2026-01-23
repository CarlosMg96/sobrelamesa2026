import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  Box,
  CssBaseline,
  Drawer,
  useTheme,
  Toolbar
} from '@mui/material';
import Navbar from '../components/Navbar';
import SidebarMenu from '../components/SidebarMenu';
import { useAuth } from '../modules/auth/hooks/useAuth';

const drawerWidth = 240;

const TITLES = {
  '/dashboard': 'Dashboard',
  '/events': 'Eventos',
  '/products': 'Productos',
};

const PrivateLayout = () => {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
  };

  const title = TITLES[location.pathname] || 'Panel de Control';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <Navbar onMenuClick={handleDrawerToggle} title={title} />
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          <SidebarMenu onLogout={handleLogout} />
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          <SidebarMenu onLogout={handleLogout} />
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 8, sm: 0 },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default PrivateLayout;
import { Drawer, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SidebarHeader from './SidebarHeader';
import SidebarMenu from './SidebarMenu';

const Sidebar = ({ 
  mobileOpen, 
  handleDrawerToggle, 
  drawerWidth, 
  handleLogout 
}) => {
  const theme = useTheme();

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      aria-label="menú de navegación"
    >
      {/* Drawer para móviles */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Mejor rendimiento en móviles
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            backgroundColor: theme.palette.background.paper,
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <SidebarHeader />
        <SidebarMenu handleLogout={handleLogout} />
      </Drawer>

      {/* Drawer para escritorio */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            backgroundColor: theme.palette.background.paper,
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
        open
      >
        <SidebarHeader />
        <SidebarMenu handleLogout={handleLogout} />
      </Drawer>
    </Box>
  );
};

export default Sidebar;

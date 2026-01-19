import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventIcon from '@mui/icons-material/Event';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LogoutIcon from '@mui/icons-material/Logout';

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Eventos', icon: <EventIcon />, path: '/events' },
  { text: 'Productos', icon: <ShoppingCartIcon />, path: '/products' },
];

const SidebarMenu = ({ handleLogout }) => {
  return (
    <List>
      {menuItems.map((item) => (
        <ListItem 
          button 
          key={item.text} 
          component={RouterLink} 
          to={item.path}
          sx={{
            '&:hover': {
              backgroundColor: 'action.hover',
            },
            '&.Mui-selected': {
              backgroundColor: 'primary.light',
              '&:hover': {
                backgroundColor: 'primary.light',
              },
            },
          }}
        >
          <ListItemIcon sx={{ color: 'text.primary' }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText primary={item.text} />
        </ListItem>
      ))}
      <Divider sx={{ my: 1 }} />
      <ListItem 
        button 
        onClick={handleLogout}
        sx={{
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <ListItemIcon sx={{ color: 'text.primary' }}>
          <LogoutIcon />
        </ListItemIcon>
        <ListItemText primary="Cerrar sesión" />
      </ListItem>
    </List>
  );
};

export default SidebarMenu;

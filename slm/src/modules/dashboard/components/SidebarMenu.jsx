import { Toolbar, Typography, Divider, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Dashboard as DashboardIcon, List as ListIcon, Logout as LogoutIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';

const SidebarMenu = ({ onLogout }) => (
  <div>
    <Toolbar>
      <Typography variant="h6" noWrap component="div">
        Sobre la Mesa
      </Typography>
    </Toolbar>
    <Divider />
    <List>
      <ListItem button component="a" href="/dashboard">
        <ListItemIcon>
          <DashboardIcon />
        </ListItemIcon>
        <ListItemText primary="Dashboard" />
      </ListItem>
      <ListItem button component="a" href="/events">
        <ListItemIcon>
          <ListIcon />
        </ListItemIcon>
        <ListItemText primary="Eventos" />
      </ListItem>
      <ListItem button component="a" href="/products">
        <ListItemIcon>
          <ListIcon />
        </ListItemIcon>
        <ListItemText primary="Productos" />
      </ListItem>
      <ListItem button onClick={onLogout}>
        <ListItemIcon>
          <LogoutIcon />
        </ListItemIcon>
        <ListItemText primary="Cerrar sesión" />
      </ListItem>
    </List>
  </div>
);

SidebarMenu.propTypes = {
  onLogout: PropTypes.func.isRequired,
};

export default SidebarMenu;

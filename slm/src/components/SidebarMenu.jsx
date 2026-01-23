import {
  Toolbar,
  Box,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton
} from '@mui/material';

import { NavLink } from 'react-router-dom';
import { alpha } from '@mui/material/styles';

import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import PowerSettingsNewOutlinedIcon from '@mui/icons-material/PowerSettingsNewOutlined';

const menuItems = [
  { text: 'Dashboard', icon: <GridViewOutlinedIcon />, to: '/dashboard' },
  { text: 'Eventos', icon: <CalendarMonthOutlinedIcon />, to: '/events' },
  { text: 'Productos', icon: <StorefrontOutlinedIcon />, to: '/products' },
];

const SidebarMenu = ({ onLogout }) => (
  <Box
    sx={(theme) => ({
      height: '100%',
      bgcolor: 'primary.main',
      color: theme.palette.primary.contrastText,
      display: 'flex',
      flexDirection: 'column',
    })}
  >
    {/* Logo */}
    <Toolbar sx={{ justifyContent: 'center', py: 3 }}>
      <Box
        component="img"
        src="../../logos/icono_logo_04.png"
        alt="Logo"
        sx={{ width: 90, opacity: 0.9 }}
      />
    </Toolbar>

    {/* Navegación */}
    <List sx={{ px: 1.5, flexGrow: 1 }}>
      {menuItems.map((item) => (
        <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            component={NavLink}
            to={item.to}
            sx={(theme) => ({
              height: 44,
              borderRadius: '12px',
              px: 2,
              color: alpha(theme.palette.primary.contrastText, 0.7),
              position: 'relative',

              '& .MuiListItemIcon-root': {
                color: 'inherit',
                minWidth: 34,
              },

              '&:hover': {
                color: theme.palette.primary.contrastText,
                bgcolor: alpha(theme.palette.primary.contrastText, 0.08),
              },

              /* 👇 ESTADO ACTIVO */
              '&.active': {
                color: theme.palette.primary.contrastText,
                bgcolor: alpha(theme.palette.primary.contrastText, 0.14),
                fontWeight: 600,

                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 8,
                  bottom: 8,
                  width: 4,
                  borderRadius: 4,
                  backgroundColor: theme.palette.primary.contrastText,
                },
              },
            })}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.text}
              primaryTypographyProps={{ fontSize: 14 }}
            />
          </ListItemButton>
        </ListItem>
      ))}
    </List>

    {/* Logout */}
    <Box sx={{ px: 1.5, pb: 2 }}>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', mb: 1.5 }} />
      <ListItem disablePadding>
        <ListItemButton
          onClick={onLogout}
          sx={(theme) => ({
            height: 44,
            borderRadius: '12px',
            px: 2,
            color: alpha(theme.palette.primary.contrastText, 0.6),

            '& .MuiListItemIcon-root': {
              color: 'inherit',
              minWidth: 34,
            },

            '&:hover': {
              color: theme.palette.error.main,
              bgcolor: alpha(theme.palette.error.main, 0.16),
            },
          })}
        >
          <ListItemIcon>
            <PowerSettingsNewOutlinedIcon />
          </ListItemIcon>
          <ListItemText primary="Salir" />
        </ListItemButton>
      </ListItem>
    </Box>
  </Box>
);

export default SidebarMenu;

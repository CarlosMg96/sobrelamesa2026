import { AppBar, Toolbar, Typography, IconButton, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ThemeToggle from '../../../../components/ThemeToggle';

const Navbar = ({ drawerWidth, handleDrawerToggle }) => {
  const theme = useTheme();

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
        backgroundColor: theme.palette.mode === 'dark' 
          ? theme.palette.background.paper 
          : theme.palette.primary.main,
        boxShadow: 'none',
        borderBottom: `1px solid ${theme.palette.divider}`
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ 
            mr: 2, 
            display: { sm: 'none' },
            color: theme.palette.mode === 'dark' ? 'text.primary' : 'white'
          }}
        >
          <MenuIcon />
        </IconButton>
        <Typography 
          variant="h6" 
          noWrap 
          component="div" 
          sx={{ 
            flexGrow: 1,
            color: theme.palette.mode === 'dark' ? 'text.primary' : 'white'
          }}
        >
          Panel de Control
        </Typography>
        <ThemeToggle />
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

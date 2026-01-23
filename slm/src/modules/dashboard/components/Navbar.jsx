import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PropTypes from 'prop-types';
import ThemeToggle from '../../../components/ThemeToggle';

const Navbar = ({ onMenuClick }) => (
  <AppBar
    position="fixed"
    sx={{
      width: { sm: `calc(100% - 240px)` },
      ml: { sm: `240px` },
    }}
  >
    <Toolbar>
      <IconButton
        color="inherit"
        aria-label="open drawer"
        edge="start"
        onClick={onMenuClick}
        sx={{ mr: 2, display: { sm: 'none' } }}
      >
        <MenuIcon />
      </IconButton>
      <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
        Panel de Control
      </Typography>
      <ThemeToggle />
    </Toolbar>
  </AppBar>
);

Navbar.propTypes = {
  onMenuClick: PropTypes.func.isRequired,
};

export default Navbar;

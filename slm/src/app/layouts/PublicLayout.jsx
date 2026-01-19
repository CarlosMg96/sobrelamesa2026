import { Box, CssBaseline } from '@mui/material';
import { Outlet } from 'react-router-dom';
import ThemeToggle from '../../components/ThemeToggle';

const PublicLayout = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CssBaseline />
      <Box
        component="header"
        sx={{
          py: 2,
          px: 3,
          display: 'flex',
          justifyContent: 'flex-end',
          width: '100%',
        }}
      >
        <ThemeToggle />
      </Box>
      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Outlet />
      </Box>
      <Box
        component="footer"
        sx={{
          py: 2,
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        © {new Date().getFullYear()} Sobre la Mesa
      </Box>
    </Box>
  );
};

export default PublicLayout;

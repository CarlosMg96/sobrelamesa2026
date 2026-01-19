import { Box, Typography } from '@mui/material';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 3,
        mt: 'auto',
        textAlign: 'center',
        color: 'text.secondary',
        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        backgroundColor: (theme) => 
          theme.palette.mode === 'dark' 
            ? theme.palette.background.paper 
            : theme.palette.grey[100],
      }}
    >
      <Typography variant="body2">
        © {new Date().getFullYear()} Sobre la Mesa. Todos los derechos reservados.
      </Typography>
    </Box>
  );
};

export default Footer;

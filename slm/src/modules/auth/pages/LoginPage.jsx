import Box from '@mui/material/Box'
import { LoginForm } from '../components/LoginForm'
import Typography from '@mui/material/Typography'

export default function LoginPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        flexDirection: { xs: 'column', md: 'row' }, // columna en móvil, fila en desktop
      }}
    >
      {/* Lado izquierdo */}
      <Box
        sx={{
          flex: 1,                     // ocupa mitad en desktop
          bgcolor: 'primary.main',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2,
        }}
      >
        <Box
          component="img"
          src="/logos/logo_04.png"
          alt="Logo"
          sx={{
            maxWidth: 450,
            width: '100%',
            height: 'auto',
          }}
        />
      </Box>

      {/* Lado derecho */}
      <Box
        sx={{
          flex: 1,                     // ocupa mitad en desktop
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2,
        }}
      >
        <Box width="100%" maxWidth={400}>
          <Typography variant="h3" align="center" mb={2}>Login</Typography>
          <LoginForm />
        </Box>
      </Box>
    </Box>
  )
}

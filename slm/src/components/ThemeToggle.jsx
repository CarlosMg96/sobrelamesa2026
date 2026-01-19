import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useTheme } from '../theme/ThemeContext';

const ThemeToggle = () => {
  const { mode, toggleColorMode } = useTheme();

  return (
    <Tooltip title={mode === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>
      <IconButton onClick={toggleColorMode} color="inherit">
        {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;

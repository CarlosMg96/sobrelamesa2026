import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined';
import PropTypes from 'prop-types';
import ThemeToggle from '../components/ThemeToggle';

const Navbar = ({ onMenuClick, title = "Panel de Control" }) => (
    <AppBar
        position="fixed"
        elevation={0}
        sx={{
            width: { sm: `calc(100% - 240px)` },
            ml: { sm: `240px` },
            bgcolor: 'primary.main',
            px: 1,
        }}
    >
        <Toolbar
            sx={{
                minHeight: 56,
                display: 'flex',
                gap: 1.5,
            }}
        >
            <IconButton
                onClick={onMenuClick}
                sx={{
                    display: { xs: 'inline-flex', sm: 'none' },
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.16)',
                    },
                }}
            >
                <AppsOutlinedIcon fontSize="small" />
            </IconButton>


            <Box sx={{ flexGrow: 1 }}>
                <Typography
                    variant="subtitle1"
                    sx={{
                        fontWeight: 600,
                        lineHeight: 1.2,
                    }}
                >
                    {title}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{ color: 'rgba(255,255,255,0.65)' }}
                >
                    Administración
                </Typography>
            </Box>

            <ThemeToggle />
        </Toolbar>

        {/* Línea decorativa inferior */}
        <Box
            sx={{
                height: 2,
                background:
                    'linear-gradient(90deg, #3b82f6, transparent)',
            }}
        />
    </AppBar>
);

Navbar.propTypes = {
    onMenuClick: PropTypes.func.isRequired,
    title: PropTypes.string,
};

export default Navbar;

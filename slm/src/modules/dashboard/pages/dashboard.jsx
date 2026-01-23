import { Box } from '@mui/material'

export default function Dashboard() {
    return (
        <main>
            <Box sx={{
                display: 'flex',
                flex: 1,
                minHeight: 0,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: { xs: 'column', md: 'row' },
                marginTop: 8
            }}>
                <Box component="img" src="/logos/logo_04.png" alt="Logo" sx={{ maxWidth: 300, width: '100%', height: 'auto', mb: 4 }} />
                <h1>Bienvenid@</h1>
            </Box>
        </main>
    )
}
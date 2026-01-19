import { Box, Button } from "@mui/material"
import { useNavigate } from "react-router-dom"

export default function Page404() {
    const navigate = useNavigate()

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }}
        >
            <Box
                component="img"
                src="../../logos/logo_03.png"
                sx={{ width: 300, height: 300 }}
            />

            <Box mt={-12} sx={{ textAlign: 'center' }}>
                <h1>404</h1>
                <p>Page not found</p>
                 <Button
                    variant="outlined"
                    color="success"
                    onClick={() => navigate('/dashboard')}
                >
                    Go back to dashboard
                </Button>
            </Box>
        </Box>
    )
}

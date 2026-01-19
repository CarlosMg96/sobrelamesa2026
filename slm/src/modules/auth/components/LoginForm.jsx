import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'

export function LoginForm() {
    const { login } = useAuth()

    const [form, setForm] = useState({
        email: '',
        password: ''
    })

    const [errors, setErrors] = useState({})
    const [serverError, setServerError] = useState('')
    const [loading, setLoading] = useState(false)

    const validate = () => {
        const newErrors = {}

        if (!form.email) {
            newErrors.email = 'El email es obligatorio'
        } else if (!/\S+@\S+\.\S+/.test(form.email)) {
            newErrors.email = 'Email inválido'
        }

        if (!form.password) {
            newErrors.password = 'La contraseña es obligatoria'
        } else if (form.password.length < 6) {
            newErrors.password = 'Mínimo 6 caracteres'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleChange = (field, value) => {
        setForm({ ...form, [field]: value })

        // Limpia el error mientras escribe
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' })
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setServerError('')

        if (!validate()) return

        try {
            setLoading(true)
            await login(form)
        } catch (err) {
            setServerError('Credenciales incorrectas')
        } finally {
            setLoading(false)
        }
    }

    const isFormValid = () => {
        return (
            form.email &&
            /\S+@\S+\.\S+/.test(form.email) &&
            form.password &&
            form.password.length >= 6
        )
    }


    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            display="flex"
            flexDirection="column"
            gap={2}
            maxWidth={400}
            mx="auto"
        >
            {serverError && <Alert severity="error">{serverError}</Alert>}

            <TextField
                label="Email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
            />

            <TextField
                label="Password"
                type="password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                error={!!errors.password}
                helperText={errors.password}
            />

            <Button
                type="submit"
                disabled={!isFormValid() || loading}
                variant="contained"
            >
                {loading ? 'Cargando...' : 'Login'}
            </Button>
        </Box>
    )
}

import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function LoginForm() {
    const { login } = useAuth()
    const [form, setForm] = useState({ email: '', password: '' })

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await login(form)
        } catch (err) {
            console.error('Error en login:', err)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <input
                placeholder="Email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
            />
            <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
            />
            <button type="submit">Login</button>
        </form>
    )
}

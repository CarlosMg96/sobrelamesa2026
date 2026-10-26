import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function LoginForm() {
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!form.email.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Ingresa un formato de correo válido';
    }

    if (!form.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (form.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    try {
      setLoading(true);
      await login(form);
    } catch (err) {
      setServerError(
        err?.response?.data?.message || 'Credenciales incorrectas o usuario inactivo'
      );
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    form.email &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.password &&
    form.password.length >= 6;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Alerta de error del servidor */}
      {serverError && (
        <div className="slm-login-alert">
          <i className="bi bi-exclamation-triangle-fill fs-5 text-danger"></i>
          <span>{serverError}</span>
        </div>
      )}

      {/* Campo Email */}
      <div className="slm-field-group">
        <label className="slm-field-label" htmlFor="slm-login-email">
          <i className="bi bi-envelope"></i>
          <span>Correo Electrónico</span>
        </label>
        <div className={`slm-input-box ${errors.email ? 'has-error' : ''}`}>
          <i className="bi bi-person-fill slm-field-icon"></i>
          <input
            id="slm-login-email"
            type="email"
            className="slm-form-input"
            placeholder="ejemplo@sobrelamesa.com"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            disabled={loading}
            autoComplete="email"
          />
        </div>
        {errors.email && (
          <div className="slm-field-error-msg">
            <i className="bi bi-exclamation-circle"></i>
            <span>{errors.email}</span>
          </div>
        )}
      </div>

      {/* Campo Contraseña */}
      <div className="slm-field-group">
        <label className="slm-field-label" htmlFor="slm-login-password">
          <i className="bi bi-shield-lock"></i>
          <span>Contraseña</span>
        </label>
        <div className={`slm-input-box ${errors.password ? 'has-error' : ''}`}>
          <i className="bi bi-lock-fill slm-field-icon"></i>
          <input
            id="slm-login-password"
            type={showPassword ? 'text' : 'password'}
            className="slm-form-input"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
            disabled={loading}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="slm-password-toggle-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex="-1"
            title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
          >
            <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
          </button>
        </div>
        {errors.password && (
          <div className="slm-field-error-msg">
            <i className="bi bi-exclamation-circle"></i>
            <span>{errors.password}</span>
          </div>
        )}
      </div>

      {/* Botón de Submit */}
      <button
        type="submit"
        className="slm-login-btn"
        disabled={!isFormValid || loading}
      >
        {loading ? (
          <>
            <span
              className="spinner-border spinner-border-sm"
              role="status"
              aria-hidden="true"
              style={{ width: '1rem', height: '1rem', borderWidth: '2px' }}
            ></span>
            <span>Verificando credenciales...</span>
          </>
        ) : (
          <>
            <span>Iniciar Sesión</span>
            <i className="bi bi-arrow-right fs-5"></i>
          </>
        )}
      </button>

      {/* Nota de soporte */}
      <div
        style={{
          marginTop: '1.75rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#94a3b8',
        }}
      >
      </div>
    </form>
  );
}

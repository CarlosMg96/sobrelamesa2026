import Swal from 'sweetalert2';

// Toast flotante no invasivo (arriba a la derecha)
export const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    }
});

export const showToast = (message, icon = 'success') => {
    return Toast.fire({
        icon,
        title: message
    });
};

// Modal de Alerta informativa o de error
export const showAlert = ({ title, text, icon = 'info', confirmButtonText = 'Aceptar' }) => {
    return Swal.fire({
        title,
        text,
        icon,
        confirmButtonColor: '#0d6efd',
        confirmButtonText
    });
};

// Modal de Confirmación
export const showConfirm = ({ title, text, confirmButtonText = 'Sí, confirmar', cancelButtonText = 'Cancelar', icon = 'warning' }) => {
    return Swal.fire({
        title,
        text,
        icon,
        showCancelButton: true,
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#6c757d',
        confirmButtonText,
        cancelButtonText,
        reverseButtons: true
    });
};

const alerts = {
    Toast,
    showToast,
    showAlert,
    showConfirm
};

export default alerts;

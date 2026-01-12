import { Toast } from './Toast'

export function ToastContainer({ toasts }) {
    return (
        <div style={styles.container}>
            {toasts.map(t => (
                <Toast key={t.id} message={t.message} />
            ))}
        </div>
    )
}

const styles = {
    container: {
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999
    }
}

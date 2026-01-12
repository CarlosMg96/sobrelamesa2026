export function Toast({ message }) {
    return (
        <div style={styles.toast}>
            {message}
        </div>
    )
}

const styles = {
    toast: {
        background: '#111',
        color: '#fff',
        padding: '10px 16px',
        marginBottom: 8,
        borderRadius: 6
    }
}

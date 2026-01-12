export const AppEvents = {
    UNAUTHORIZED: 'unauthorized',
    OFFLINE: 'offline',
    API_ERROR: 'api-error'
}

const listeners = {}

export function emit(event, payload) {
    listeners[event]?.forEach(cb => cb(payload))
}

export function on(event, callback) {
    listeners[event] = listeners[event] || []
    listeners[event].push(callback)

    return () => {
        listeners[event] = listeners[event].filter(cb => cb !== callback)
    }
}

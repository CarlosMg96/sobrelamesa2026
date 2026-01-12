import axios from 'axios'
import { setupInterceptors } from './interceptors'

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3000'

const httpClient = axios.create({
    baseURL: SERVER_URL,
    timeout: 10000
})

setupInterceptors(httpClient)

const apiClient = {
    doGet(url, config) {
        return httpClient.get(url, config)
    },
    doPost(url, data) {
        return httpClient.post(url, data)
    },
    doPut(url, data) {
        return httpClient.put(url, data)
    },
    doDelete(url, params) {
        return httpClient.delete(url, { params })
    }
}

export default apiClient

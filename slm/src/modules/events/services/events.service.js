import axiosClientApi from '../../../app/api/httpClient'

export const getEventsListService = async (params) => {
    try {
        const { data } = await axiosClientApi.doGet('/events/v1/list', {params})
        return data
    } catch (error) {
        console.error('Error en getEventsService:', error)
        throw error
    }
}



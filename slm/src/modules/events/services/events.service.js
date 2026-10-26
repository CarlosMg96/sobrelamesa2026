import axiosClientApi from '../../../app/api/httpClient'

export const getEventsListService = async (params) => {
    try {
        const { data } = await axiosClientApi.doGet('/events/v1/list', {params})
        return data
    } catch (error) {
        console.error('Error en getEventsService:', error)
        throw error
    }
};

export const getSolversService = async () => {
    try {
        const { data } = await axiosClientApi.doGet('/events/v1/solvers')
        return data
    } catch (error) {
        console.error('Error en getSolversService:', error)
        throw error
    }
};

export const getCalendarEventsService = async (params) => {
    try {
        const { data } = await axiosClientApi.doGet('/events/v1/calendar', { params });
        return data;
    } catch (error) {
        console.error('Error en getCalendarEventsService:', error);
        throw error;
    }
};

export const addCommentService = async (commentData) => {
    try {
        const { data } = await axiosClientApi.doPost('/events/v1/comment', commentData);
        return data;
    } catch (error) {
        console.error('Error en addCommentService:', error);
        throw error;
    }
};

import axiosClientApi from '../../../app/api/httpClient';

export const getProductCategoriesService = async () => {
    try {
        const { data } = await axiosClientApi.doGet('/products/categories');
        return data;
    } catch (error) {
        console.error('Error en getProductCategoriesService:', error);
        throw error;
    }
};

export const getProductsListService = async (params) => {
    try {
        const { data } = await axiosClientApi.doGet('/products/list', { params });
        return data;
    } catch (error) {
        console.error('Error en getProductsListService:', error);
        throw error;
    }
};

export const checkStockAvailabilityService = async (payload) => {
    try {
        const { data } = await axiosClientApi.doPost('/products/check-availability', payload);
        return data;
    } catch (error) {
        console.error('Error en checkStockAvailabilityService:', error);
        throw error;
    }
};

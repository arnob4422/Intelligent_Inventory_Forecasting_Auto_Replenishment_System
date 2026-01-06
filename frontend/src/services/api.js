import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000, // 10 seconds
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Unauthorized - clear token and redirect to login
            localStorage.removeItem('authToken');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// API methods
export const apiService = {
    // Products
    getProducts: () => api.get('/api/products/'),
    getProduct: (id) => api.get(`/api/products/${id}`),
    createProduct: (data) => api.post('/api/products/', data),
    updateProduct: (id, data) => api.put(`/api/products/${id}`, data),
    deleteProduct: (id) => api.delete(`/api/products/${id}`),

    // Inventory
    getInventory: (params) => api.get('/api/inventory/', { params }),
    getLowStockItems: (threshold) => api.get('/api/inventory/low-stock/', { params: { threshold } }),
    createInventory: (data) => api.post('/api/inventory/', data),
    updateInventory: (id, data) => api.put(`/api/inventory/${id}`, data),
    deleteInventory: (id) => api.delete(`/api/inventory/${id}`),

    // Sales
    getSalesData: (params) => api.get('/api/sales/', { params }),
    getSalesSummary: (params) => api.get('/api/sales/analytics/summary', { params }),
    uploadSalesCSV: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/api/sales/bulk-upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // Forecasts
    generateForecast: (data) => api.post('/api/forecast/generate', data),
    getForecasts: (params) => api.get('/api/forecast/', { params }),

    // Anomalies
    detectAnomalies: (data) => api.post('/api/anomalies/detect', data),
    getAnomalies: (params) => api.get('/api/anomalies/', { params }),
    resolveAnomaly: (id) => api.put(`/api/anomalies/${id}/resolve`),

    // Recommendations
    generateRecommendations: (params) => api.post('/api/recommendations/generate', null, { params }),
    getRecommendations: (params) => api.get('/api/recommendations/', { params }),
    updateRecommendationStatus: (id, status) => api.put(`/api/recommendations/${id}/status`, null, { params: { status } }),

    // Simulations
    runSimulation: (data) => api.post('/api/simulations/run', data),
    getSimulations: () => api.get('/api/simulations/'),
    getSimulation: (id) => api.get(`/api/simulations/${id}`),

    // Locations
    getLocations: () => api.get('/api/locations/'),

    // Stats
    getStats: () => api.get('/api/stats'),

    // Cameras
    getCameras: (skip = 0, limit = 100, locationId = null) => {
        let url = `/api/cameras/?skip=${skip}&limit=${limit}`;
        if (locationId) url += `&location_id=${locationId}`;
        return api.get(url);
    },
    detectProduct: (data) => api.post('/api/camera/detect', data),
    createCamera: (data) => api.post('/api/cameras/', data),

    // Footages
    getFootages: (params) => api.get('/api/footages/', { params }),
    detectProductWithSnapshot: (formData) => {
        return api.post('/api/camera/detect-snapshot', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    uploadSnapshot: (locationId, cameraId, fileBlob) => {
        const formData = new FormData();
        formData.append('file', fileBlob, 'snapshot.jpg');
        return api.post(`/api/camera/snapshot?location_id=${locationId}&camera_id=${cameraId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    // AI Mappings
    getMappings: () => api.get('/api/camera/mappings'),
    createMapping: (data) => api.post('/api/camera/mappings', data),
    // AI Training
    getEmbeddings: () => api.get('/api/camera/embeddings'),
    trainProduct: (data) => api.post('/api/camera/train', data),
    // High Precision Analysis
    analyzeUpload: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/api/camera/analyze-upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    // YOLOv8 Backend Integration
    yolov8Detect: (formData) => {
        return axios.post('http://127.0.0.1:8001/api/detect/realtime', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000 // 30 second timeout for images
        });
    },
    detectVideo: (formData) => {
        return axios.post('http://127.0.0.1:8001/api/detect/video', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 300000 // 5 minute timeout for deep video scans
        });
    }
};



export default api;

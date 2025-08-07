import axios from 'axios';

// API configuration with fallback handling
const getApiBaseUrl = () => {
  // For production, use environment variable or detect if running on localhost
  const envUrl = import.meta.env.VITE_API_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // Auto-detect based on current hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If running on localhost, use local backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    
    // For deployed frontend, try to connect to the same origin first
    // You should replace this with your actual backend URL in production
    return `${window.location.protocol}//${hostname}/api`;
  }
  
  // Fallback
  return 'http://localhost:5000/api';
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000, // Increased timeout for serverless functions
  headers: {
    'Content-Type': 'application/json'
  },
  // Add retry configuration
  retry: 3,
  retryDelay: 1000
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with better error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config } = error;
    
    // Handle network errors and timeouts
    if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
      // For network errors, try to retry up to 3 times
      if (!config.__retryCount) {
        config.__retryCount = 0;
      }
      
      if (config.__retryCount < (config.retry || 3)) {
        config.__retryCount += 1;
        
        // Exponential backoff
        const delay = config.retryDelay * Math.pow(2, config.__retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return api(config);
      }
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
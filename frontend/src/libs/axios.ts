import axios from "axios";
import store from "store2";

// Auth
const axiosInstanceAPI = axios.create({
  baseURL: import.meta.env.VITE_PUBLIC_BACKEND_AUTH_URL,
});

axiosInstanceAPI.interceptors.request.use((config) => {
  const token = store.get("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstanceAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response.status === 401) {
      store.remove("token");
      // await logout();
    }
    return Promise.reject(error);
  },
);

export { axiosInstanceAPI };

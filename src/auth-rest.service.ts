import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import authTokenService from "./auth-token.service";

/**
 * ApiService is a singleton class that provides methods to interact with an API using Axios.
 * It includes an interceptor to automatically add an authorization token to each request.
 */
/**
 * AuthRestService is a singleton class that provides methods to make HTTP requests
 * with automatic handling of authorization tokens using Axios.
 *
 * It includes interceptors to add the authorization token to request headers and
 * to handle token refresh on receiving a 401 Unauthorized response.
 *
 * @class AuthRestService
 * @example
 * const authService = AuthRestService.getInstance();
 * const data = await authService.get('/api/data');
 */
class AuthRestService {
  private static _instance: AuthRestService;
  private axiosInstance: AxiosInstance;

  /**
   * Private constructor to initialize the API service.
   *
   * - Creates an Axios instance for making HTTP requests.
   * - Sets up an interceptor to add the authorization token to the request headers.
   *
   * @throws Will reject the promise if there is an error in the request interceptor.
   */
  private constructor() {
    this.axiosInstance = axios.create();

    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await authTokenService.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            await authTokenService.refreshTokens();
            const token = await authTokenService.getAccessToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Returns the singleton instance of the ApiService.
   * If the instance does not exist, it creates a new one.
   *
   * @returns {AuthRestService} The singleton instance of the ApiService.
   */
  public static getInstance(): AuthRestService {
    if (!AuthRestService._instance) {
      AuthRestService._instance = new AuthRestService();
    }
    return AuthRestService._instance;
  }

  /**
   * Sends a GET request to the specified URL and returns the response data.
   *
   * @template T - The expected response data type.
   * @param {string} url - The URL to send the GET request to.
   * @param {AxiosRequestConfig} [config] - Optional Axios request configuration.
   * @returns {Promise<T>} - A promise that resolves to the response data of type T.
   * @throws {AxiosError} - Throws an error if the request fails.
   */
  async get<T>(
    url: string,
    config?: AxiosRequestConfig | undefined
  ): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  /**
   * Sends a POST request to the specified URL with the specified data and returns the response data.
   *
   * @template T - The expected response data type.
   * @param {string} url - The URL to send the POST request to.
   * @param {any} data - The data to send with the POST request.
   * @param {AxiosRequestConfig} [config] - Optional Axios request configuration.
   * @returns {Promise<T>} - A promise that resolves to the response data of type T.
   * @throws {AxiosError} - Throws an error if the request fails.
   */
  async post<T>(
    url: string,
    data: any,
    config?: AxiosRequestConfig | undefined
  ): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Sends a PUT request to the specified URL with the specified data and returns the response data.
   *
   * @template T - The expected response data type.
   * @param {string} url - The URL to send the PUT request to.
   * @param {any} data - The data to send with the PUT request.
   * @param {AxiosRequestConfig} [config] - Optional Axios request configuration.
   * @returns {Promise<T>} - A promise that resolves to the response data of type T.
   * @throws {AxiosError} - Throws an error if the request fails.
   */
  async put<T>(
    url: string,
    data: any,
    config?: AxiosRequestConfig | undefined
  ): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Sends a DELETE request to the specified URL and returns the response data.
   *
   * @template T - The expected response data type.
   * @param {string} url - The URL to send the DELETE request to.
   * @param {AxiosRequestConfig} [config] - Optional Axios request configuration.
   * @returns {Promise<T>} - A promise that resolves to the response data of type T.
   * @throws {AxiosError} - Throws an error if the request fails.
   */
  async delete<T>(
    url: string,
    config?: AxiosRequestConfig | undefined
  ): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }
}

const authRestService = AuthRestService.getInstance();

export default authRestService;

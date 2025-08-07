import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import {
  IIQApiResponse,
  IIQTicket,
  IIQTicketCreate,
  IIQTicketUpdate,
  IIQTicketStatus,
  IIQTicketCategory,
  IIQTicketPriority,
  IIQUser,
  IIQAsset,
  IIQLocation,
  IIQSearchParams,
  IIQPagedResult,
  IIQAnalyticsReport,
  IIQPart,

} from '../types/common.js';

/**
 * IncidentIQ API Client for K-12 Service Management Platform
 * Supports IT Help Desk, Asset Management, Facilities, HR, and more
 */
export class IncidentIQClient {
  private client: AxiosInstance;

  constructor(
    baseURL: string = process.env.IIQ_API_BASE_URL || 'https://demo.iiqstaging.com/api/v1.0',
    apiKey: string = process.env.IIQ_API_KEY || ''
  ) {
    if (!apiKey) {
      throw new Error('IncidentIQ API key is required. Please configure your district\'s API key.');
    }

    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: parseInt(process.env.IIQ_API_TIMEOUT || '30000'),
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        if (process.env.DEBUG_API) {
          console.log(`[IIQ API] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => {
        console.error('[IIQ API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response) {
          console.error(`[IIQ API] Error ${error.response.status}: ${error.response.statusText}`);
          console.error('[IIQ API] Response data:', error.response.data);
        } else if (error.request) {
          console.error('[IIQ API] No response received');
        } else {
          console.error('[IIQ API] Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic request method
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }

  // Test connection
  async testConnection(): Promise<{ connected: boolean; districtName?: string; error?: string }> {
    try {
      // Try to get ticket statuses as a simple test
      await this.client.get<IIQApiResponse<IIQTicketStatus[]>>('/tickets/statuses');
      return { 
        connected: true,
        districtName: this.client.defaults.baseURL?.split('.')[0]?.split('//')[1]
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      return { 
        connected: false,
        error: axiosError.response?.status === 401 
          ? 'Invalid API key' 
          : `Connection failed: ${axiosError.message}`
      };
    }
  }

  // IT Help Desk - Ticket operations
  async searchTickets(params: IIQSearchParams): Promise<IIQPagedResult<IIQTicket>> {
    const response = await this.request<IIQApiResponse<IIQPagedResult<IIQTicket>>>({
      method: 'POST',
      url: '/tickets',
      data: params
    });
    return response.Data || { Items: [], TotalCount: 0, PageIndex: 0, PageSize: 0 };
  }

  async getTicket(ticketId: string): Promise<IIQTicket | null> {
    const response = await this.request<IIQApiResponse<IIQTicket>>({
      method: 'GET',
      url: `/tickets/${ticketId}`
    });
    return response.Data || null;
  }

  async createTicket(data: IIQTicketCreate): Promise<IIQTicket | null> {
    const response = await this.request<IIQApiResponse<IIQTicket>>({
      method: 'POST',
      url: '/tickets/new',
      data
    });
    return response.Data || null;
  }

  async updateTicket(ticketId: string, data: IIQTicketUpdate): Promise<IIQTicket | null> {
    const response = await this.request<IIQApiResponse<IIQTicket>>({
      method: 'PUT',
      url: `/tickets/${ticketId}`,
      data
    });
    return response.Data || null;
  }

  async closeTicket(ticketId: string, resolution?: string): Promise<boolean> {
    const response = await this.request<IIQApiResponse<any>>({
      method: 'PUT',
      url: `/tickets/${ticketId}/close`,
      data: { Resolution: resolution }
    });
    return response.Success;
  }

  async getTicketStatuses(): Promise<IIQTicketStatus[]> {
    const response = await this.request<IIQApiResponse<IIQTicketStatus[]>>({
      method: 'GET',
      url: '/tickets/statuses'
    });
    return response.Data || [];
  }

  async getTicketCategories(): Promise<IIQTicketCategory[]> {
    const response = await this.request<IIQApiResponse<IIQTicketCategory[]>>({
      method: 'GET',
      url: '/tickets/categories'
    });
    return response.Data || [];
  }

  async getTicketPriorities(): Promise<IIQTicketPriority[]> {
    const response = await this.request<IIQApiResponse<IIQTicketPriority[]>>({
      method: 'GET',
      url: '/tickets/priorities'
    });
    return response.Data || [];
  }

  // User operations (Students, Staff, Parents)
  async searchUsers(params: IIQSearchParams): Promise<IIQPagedResult<IIQUser>> {
    const response = await this.request<IIQApiResponse<IIQPagedResult<IIQUser>>>({
      method: 'POST',
      url: '/users',
      data: params
    });
    return response.Data || { Items: [], TotalCount: 0, PageIndex: 0, PageSize: 0 };
  }

  async getUser(userId: string): Promise<IIQUser | null> {
    const response = await this.request<IIQApiResponse<IIQUser>>({
      method: 'GET',
      url: `/users/${userId}`
    });
    return response.Data || null;
  }

  async getAgents(): Promise<IIQUser[]> {
    const response = await this.request<IIQApiResponse<IIQUser[]>>({
      method: 'GET',
      url: '/users/agents'
    });
    return response.Data || [];
  }

  // IT Asset Management operations (Chromebooks, iPads, etc.)
  async searchAssets(params: IIQSearchParams): Promise<IIQPagedResult<IIQAsset>> {
    const response = await this.request<IIQApiResponse<IIQPagedResult<IIQAsset>>>({
      method: 'POST',
      url: '/assets',
      data: params
    });
    return response.Data || { Items: [], TotalCount: 0, PageIndex: 0, PageSize: 0 };
  }

  async getAsset(assetId: string): Promise<IIQAsset | null> {
    const response = await this.request<IIQApiResponse<IIQAsset>>({
      method: 'GET',
      url: `/assets/${assetId}`
    });
    return response.Data || null;
  }

  async searchAssetByTag(assetTag: string): Promise<IIQAsset | null> {
    const response = await this.request<IIQApiResponse<IIQAsset>>({
      method: 'GET',
      url: `/assets/search/${assetTag}`
    });
    return response.Data || null;
  }

  async getAssetCounts(): Promise<Record<string, number>> {
    const response = await this.request<IIQApiResponse<Record<string, number>>>({
      method: 'GET',
      url: '/assets/counts'
    });
    return response.Data || {};
  }

  // Location operations (Buildings, Rooms)
  async getAllLocations(): Promise<IIQLocation[]> {
    const response = await this.request<IIQApiResponse<IIQLocation[]>>({
      method: 'GET',
      url: '/locations/all'
    });
    return response.Data || [];
  }

  async getLocation(locationId: string): Promise<IIQLocation | null> {
    const response = await this.request<IIQApiResponse<IIQLocation>>({
      method: 'GET',
      url: `/locations/${locationId}`
    });
    return response.Data || null;
  }

  async searchLocations(params: IIQSearchParams): Promise<IIQPagedResult<IIQLocation>> {
    const response = await this.request<IIQApiResponse<IIQPagedResult<IIQLocation>>>({
      method: 'POST',
      url: '/locations',
      data: params
    });
    return response.Data || { Items: [], TotalCount: 0, PageIndex: 0, PageSize: 0 };
  }

  // Parts inventory for repairs
  async searchParts(params: IIQSearchParams): Promise<IIQPagedResult<IIQPart>> {
    const response = await this.request<IIQApiResponse<IIQPagedResult<IIQPart>>>({
      method: 'POST',
      url: '/parts',
      data: params
    });
    return response.Data || { Items: [], TotalCount: 0, PageIndex: 0, PageSize: 0 };
  }

  async getPart(partId: string): Promise<IIQPart | null> {
    const response = await this.request<IIQApiResponse<IIQPart>>({
      method: 'GET',
      url: `/parts/${partId}`
    });
    return response.Data || null;
  }

  // Analytics for district reporting
  async getAnalyticsReport(reportType: string, params?: Record<string, any>): Promise<IIQAnalyticsReport | null> {
    const response = await this.request<IIQApiResponse<IIQAnalyticsReport>>({
      method: 'GET',
      url: `/analytics/${reportType}`,
      params
    });
    return response.Data || null;
  }
}
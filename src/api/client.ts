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

    // Build headers with Site ID and Product ID if available
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // Add Site ID header if configured
    if (process.env.IIQ_SITE_ID) {
      headers['SiteId'] = process.env.IIQ_SITE_ID;
    }
    
    // Add Product ID for ticketing if configured (may be required for some endpoints)
    if (process.env.IIQ_PRODUCT_ID_TICKETS) {
      headers['ProductId'] = process.env.IIQ_PRODUCT_ID_TICKETS;
    }

    this.client = axios.create({
      baseURL,
      headers,
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
    // Use the simple /tickets endpoint which we know works
    // This matches the PowerShell module pattern
    const payload = {
      OnlyShowDeleted: false,
      FilterByViewPermission: false,
      ...params
    };
    
    const response = await this.request<IIQPagedResult<IIQTicket>>({
      method: 'POST',
      url: '/tickets',
      data: payload
    });
    
    // API returns paginated data directly, not wrapped in Data property
    return response || { Items: [], TotalCount: 0, PageIndex: 0, PageSize: 0 };
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
    // GET endpoints return paginated object with Items array
    const response = await this.request<any>({
      method: 'GET',
      url: '/tickets/statuses'
    });
    return response?.Items || [];
  }

  async getTicketCategories(): Promise<IIQTicketCategory[]> {
    // This endpoint doesn't exist (404 in production)
    const response = await this.request<any>({
      method: 'GET',
      url: '/tickets/categories'
    });
    return response?.Items || [];
  }

  async getTicketPriorities(): Promise<IIQTicketPriority[]> {
    // GET endpoints return paginated object with Items array
    const response = await this.request<any>({
      method: 'GET',
      url: '/tickets/priorities'
    });
    return response?.Items || [];
  }

  // User operations (Students, Staff, Parents)
  async searchUsers(params: IIQSearchParams): Promise<IIQPagedResult<IIQUser>> {
    // PowerShell module shows users endpoint uses POST with specific payload format
    const payload = {
      OnlyShowDeleted: false,
      FilterByViewPermission: false,
      ...params
    };
    
    const response = await this.request<IIQPagedResult<IIQUser>>({
      method: 'POST',
      url: '/users',
      data: payload
    });
    
    // API returns paginated data directly, not wrapped in Data property
    return response || { Items: [], TotalCount: 0, PageIndex: 0, PageSize: 0 };
  }

  async getUser(userId: string): Promise<IIQUser | null> {
    const response = await this.request<IIQApiResponse<IIQUser>>({
      method: 'GET',
      url: `/users/${userId}`
    });
    return response.Data || null;
  }

  async getAgents(): Promise<IIQUser[]> {
    // GET endpoints return paginated object with Items array
    const response = await this.request<any>({
      method: 'GET',
      url: '/users/agents'
    });
    return response?.Items || [];
  }

  // IT Asset Management operations (Chromebooks, iPads, etc.)
  async searchAssets(params: IIQSearchParams): Promise<IIQPagedResult<IIQAsset>> {
    // PowerShell module shows assets endpoint uses POST with specific payload format
    const payload = {
      OnlyShowDeleted: false,
      FilterByViewPermission: false,
      ...params
    };
    
    const response = await this.request<IIQPagedResult<IIQAsset>>({
      method: 'POST',
      url: '/assets',
      data: payload
    });
    
    // API returns paginated data directly, not wrapped in Data property
    return response || { Items: [], TotalCount: 0, PageIndex: 0, PageSize: 0 };
  }

  async getAsset(assetId: string): Promise<IIQAsset | null> {
    const response = await this.request<IIQApiResponse<IIQAsset>>({
      method: 'GET',
      url: `/assets/${assetId}`
    });
    return response.Data || null;
  }

  async searchAssetByTag(assetTag: string): Promise<IIQAsset | null> {
    // Based on validation report, this endpoint may not exist
    // Use the search endpoint with asset tag filter instead
    const searchParams = {
      SearchText: assetTag,
      PageSize: 1,
      OnlyShowDeleted: false,
      FilterByViewPermission: false
    };
    
    const response = await this.request<IIQPagedResult<IIQAsset>>({
      method: 'POST',
      url: '/assets',
      data: searchParams
    });
    
    return (response && response.Items && response.Items.length > 0) ? response.Items[0] : null;
  }

  async getAssetCounts(): Promise<Record<string, number>> {
    // This endpoint doesn't exist (404 in production)
    const response = await this.request<Record<string, number>>({
      method: 'GET',
      url: '/assets/counts'
    });
    return response || {};
  }

  // Location operations (Buildings, Rooms)
  async getAllLocations(): Promise<IIQLocation[]> {
    // GET endpoints return paginated object with Items array
    const response = await this.request<any>({
      method: 'GET',
      url: '/locations/all'
    });
    return response?.Items || [];
  }

  async getLocation(locationId: string): Promise<IIQLocation | null> {
    const response = await this.request<IIQApiResponse<IIQLocation>>({
      method: 'GET',
      url: `/locations/${locationId}`
    });
    return response.Data || null;
  }

  async searchLocations(params: IIQSearchParams): Promise<IIQPagedResult<IIQLocation>> {
    // PowerShell module pattern for location search
    const payload = {
      OnlyShowDeleted: false,
      FilterByViewPermission: false,
      ...params
    };
    
    const response = await this.request<IIQPagedResult<IIQLocation>>({
      method: 'POST',
      url: '/locations',
      data: payload
    });
    
    // API returns paginated data directly, not wrapped in Data property
    return response || { Items: [], TotalCount: 0, PageIndex: 0, PageSize: 0 };
  }

  // Parts inventory for repairs
  async getParts(): Promise<IIQPart[]> {
    // PowerShell module shows this uses GET with pagination
    const response = await this.request<IIQPagedResult<IIQPart> | IIQPart[]>({
      method: 'GET',
      url: '/parts'
    });
    
    // Handle both paginated and array responses
    if (Array.isArray(response)) {
      return response;
    }
    return response?.Items || [];
  }

  async getPart(partId: string): Promise<IIQPart | null> {
    const response = await this.request<IIQApiResponse<IIQPart>>({
      method: 'GET',
      url: `/parts/${partId}`
    });
    return response.Data || null;
  }
  
  async getPartsSuppliers(): Promise<any[]> {
    // GET endpoints return paginated object with Items array
    const response = await this.request<any>({
      method: 'GET',
      url: '/parts/suppliers'
    });
    return response?.Items || [];
  }

  // Teams (IT support teams)
  async getAllTeams(): Promise<any[]> {
    // GET endpoints return paginated object with Items array
    const response = await this.request<any>({
      method: 'GET',
      url: '/teams/all'
    });
    return response?.Items || [];
  }

  // Categories (Asset categories)
  async searchCategories(params?: IIQSearchParams): Promise<IIQPagedResult<any>> {
    // PowerShell module: POST /categories
    const payload = {
      OnlyShowDeleted: false,
      FilterByViewPermission: false,
      ...params
    };
    
    const response = await this.request<IIQPagedResult<any>>({
      method: 'POST',
      url: '/categories',
      data: payload
    });
    
    return response || { Items: [], TotalCount: 0, PageIndex: 0, PageSize: 0 };
  }

  // Custom Fields
  async searchCustomFields(entityType: 'User' | 'Asset' | 'Ticket' | 'Room'): Promise<any[]> {
    // PowerShell module: POST /custom-fields with EntityType filter
    const payload = {
      EntityType: entityType,
      OnlyShowDeleted: false,
      FilterByViewPermission: false
    };
    
    const response = await this.request<IIQPagedResult<any> | any[]>({
      method: 'POST',
      url: '/custom-fields',
      data: payload
    });
    
    // Handle both paginated and array responses
    if (Array.isArray(response)) {
      return response;
    }
    return response?.Items || [];
  }

  async getCustomFieldTypes(): Promise<any[]> {
    // GET endpoints return paginated object with Items array
    const response = await this.request<any>({
      method: 'GET',
      url: '/custom-fields/types'
    });
    return response?.Items || [];
  }

  // Rooms
  async getLocationRooms(): Promise<any[]> {
    // GET endpoints return paginated object with Items array
    const response = await this.request<any>({
      method: 'GET',
      url: '/locations/rooms'
    });
    return response?.Items || [];
  }

  // Purchase Orders
  async getPurchaseOrders(): Promise<any[]> {
    // PowerShell module: GET /purchaseorders with pagination
    const response = await this.request<IIQPagedResult<any> | any[]>({
      method: 'GET',
      url: '/purchaseorders'
    });
    
    // Handle both paginated and array responses
    if (Array.isArray(response)) {
      return response;
    }
    return response?.Items || [];
  }

  // Manufacturers
  async getGlobalManufacturers(): Promise<any[]> {
    // GET endpoints return paginated object with Items array
    const response = await this.request<any>({
      method: 'GET',
      url: '/assets/manufacturers/global'
    });
    return response?.Items || [];
  }

  // Issue Types (for tickets)
  async getIssueTypes(): Promise<any[]> {
    // GET endpoints return paginated object with Items array
    const response = await this.request<any>({
      method: 'GET',
      url: '/issues/types'
    });
    return response?.Items || [];
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

  // ========== SLA Management (NEW) ==========
  
  // Get all SLAs
  async getSLAs(): Promise<any[]> {
    const response = await this.request<IIQPagedResult<any>>({
      method: 'GET',
      url: '/slas'
    });
    return response.Items || [];
  }

  // Get SLA metrics
  async getSLAMetrics(): Promise<any[]> {
    const response = await this.request<IIQPagedResult<any>>({
      method: 'GET',
      url: '/metrics'
    });
    return response.Items || [];
  }

  // Get SLA metric types
  async getSLAMetricTypes(): Promise<any[]> {
    const response = await this.request<IIQPagedResult<any>>({
      method: 'GET',
      url: '/metrics/types'
    });
    return response.Items || [];
  }

  // Get ticket SLA status
  async getTicketSLA(ticketId: string): Promise<any | null> {
    const response = await this.request<any>({
      method: 'GET',
      url: `/tickets/${ticketId}/sla`
    });
    return response.Item || response || null;
  }

  // ========== View Management (NEW) ==========
  
  // Get user views
  async getUserViews(): Promise<any[]> {
    const response = await this.request<IIQPagedResult<any>>({
      method: 'GET',
      url: '/users/views'
    });
    return response.Items || [];
  }

  // Get all views
  async getViews(): Promise<any[]> {
    const response = await this.request<IIQPagedResult<any>>({
      method: 'GET',
      url: '/views'
    });
    return response.Items || [];
  }

  // Get ticket views
  async getTicketViews(): Promise<any[]> {
    const response = await this.request<IIQPagedResult<any>>({
      method: 'GET',
      url: '/views/tickets'
    });
    return response.Items || [];
  }

  // Get asset views  
  async getAssetViews(): Promise<any[]> {
    const response = await this.request<IIQPagedResult<any>>({
      method: 'GET',
      url: '/views/assets'
    });
    return response.Items || [];
  }

  // Get user-specific views
  async getUserSpecificViews(): Promise<any[]> {
    const response = await this.request<IIQPagedResult<any>>({
      method: 'GET',
      url: '/views/users'
    });
    return response.Items || [];
  }

  // ========== Notifications & Emails (NEW) ==========
  
  // Get emails for a ticket
  async getTicketEmails(ticketId: string): Promise<any[]> {
    const response = await this.request<IIQPagedResult<any>>({
      method: 'GET',
      url: `/notifications/emails/for/ticket/${ticketId}`
    });
    return response.Items || [];
  }

  // Query notifications
  async queryNotifications(params?: { IncludeRead?: boolean; IncludeArchived?: boolean; IncludeUnarchived?: boolean }): Promise<any[]> {
    const response = await this.request<IIQPagedResult<any>>({
      method: 'POST',
      url: '/notifications',
      data: params || { IncludeRead: true, IncludeArchived: false, IncludeUnarchived: true }
    });
    return response.Items || [];
  }

  // Get unarchived notifications
  async getUnarchivedNotifications(): Promise<any[]> {
    const response = await this.request<IIQPagedResult<any>>({
      method: 'GET',
      url: '/notifications/unarchived'
    });
    return response.Items || [];
  }

  // Get unread notifications
  async getUnreadNotifications(): Promise<any[]> {
    const response = await this.request<IIQPagedResult<any>>({
      method: 'GET',
      url: '/notifications/unread'
    });
    return response.Items || [];
  }

  // Mark all notifications as read
  async markAllNotificationsRead(): Promise<boolean> {
    const response = await this.request<any>({
      method: 'POST',
      url: '/notifications/all-read'
    });
    return response.StatusCode === 200;
  }

  // Mark specific notification as read
  async markNotificationRead(notificationId: string): Promise<boolean> {
    const response = await this.request<any>({
      method: 'POST',
      url: `/notifications/${notificationId}/read`
    });
    return response.StatusCode === 200;
  }
}

// Export alias for tools
export { IncidentIQClient as ApiClient };
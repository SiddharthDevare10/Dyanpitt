import { ERROR_MESSAGES } from '../utils/errorMessages.js';
import requestCache, { getCacheTTL } from '../utils/requestCache.js';
import logger from '../utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Frontend API Base URL configured

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get auth token from sessionStorage (preferred) or fallback to localStorage
  getToken() {
    // Check sessionStorage first (session-based tokens)
    let token = sessionStorage.getItem('authToken');
    
    // Check for temporary token (used during congratulations navigation)
    if (!token) {
      const tempToken = localStorage.getItem('tempAuthToken');
      if (tempToken) {
        sessionStorage.setItem('authToken', tempToken);
        localStorage.removeItem('tempAuthToken');
        token = tempToken;
      }
    }
    
    // Fallback to localStorage for existing users (migrate them to sessionStorage)
    if (!token) {
      token = localStorage.getItem('authToken');
      if (token) {
        // Migrate to sessionStorage and remove from localStorage
        sessionStorage.setItem('authToken', token);
        localStorage.removeItem('authToken');
      }
    }
    
    return token;
  }

  // Set auth token in sessionStorage (clears when tab/browser closes)
  setToken(token) {
    sessionStorage.setItem('authToken', token);
    
    // Also clear any existing localStorage token to prevent conflicts
    localStorage.removeItem('authToken');
  }

  // Remove auth token from both storage types
  removeToken() {
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('authToken');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  }

  // Get auth headers
  getAuthHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Check if token needs refresh (within 2 minutes of expiry)
  shouldRefreshToken() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      const refreshBuffer = 2 * 60; // 2 minutes before expiry
      
      return payload.exp <= (currentTime + refreshBuffer);
    } catch (error) {
      logger.warn('Failed to parse JWT token:', error);
      return false;
    }
  }

  // Generic API request method with auto token refresh and caching
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const method = options.method || 'GET';
    
    
    // Check cache for GET requests
    if (method === 'GET') {
      const cached = requestCache.get(url, method);
      if (cached) {
        return cached;
      }
    }
    
    // Check if we need to refresh token before making request
    if (this.shouldRefreshToken() && endpoint !== '/auth/refresh') {
      try {
        await this.refreshToken();
      } catch (error) {
        logger.warn('Token refresh failed:', error);
        // Continue with existing token, let the server handle expiry
      }
    }
    
    const config = {
      headers: this.getAuthHeaders(),
      timeout: 15000, // 15 second timeout
      ...options
    };

    // Optional ky client under feature flag
    const USE_KY = (import.meta.env.VITE_USE_KY_CLIENT || 'false').toLowerCase() === 'true';
    if (USE_KY) {
      try {
        const _kyPkg = 'ky';
        const { default: ky } = await import(/* @vite-ignore */ _kyPkg);
        const http = ky.create({
          prefixUrl: this.baseURL.replace(/\/$/, ''),
          timeout: config.timeout,
          headers: config.headers,
          hooks: {
            beforeRequest: [
              request => {
                // Merge headers for each request
                Object.entries(config.headers || {}).forEach(([k, v]) => request.headers.set(k, v));
              },
            ],
          },
        });

        const kyOptions = { method, signal: undefined };
        // ky uses json option for JSON bodies
        if (config.body && typeof config.body === 'string') {
          try {
            kyOptions.json = JSON.parse(config.body);
          } catch {
            kyOptions.body = config.body; // non-JSON string
          }
        } else if (config.body instanceof FormData) {
          kyOptions.body = config.body;
        }

        const data = await http(endpoint.replace(/^\//, ''), kyOptions).json();

        if (method === 'GET') {
          const ttl = getCacheTTL(endpoint);
          if (ttl > 0) requestCache.set(url, method, data, ttl);
        }
        return data;
      } catch (e) {
        // Fallback to fetch if ky not installed or failed
        logger.warn('ky client unavailable, falling back to fetch:', e);
      }
    }

    try {
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage;
        let errorData;
        try {
          errorData = await response.json();
          
          // If it's a validation error, include the validation details
          if (errorData.errors && Array.isArray(errorData.errors)) {
            // Validation errors handled in UI
            const validationMessages = errorData.errors.map(err => `${err.path || err.param}: ${err.msg}`).join(', ');
            errorMessage = `${errorData.message || 'Validation failed'}: ${validationMessages}`;
          } else {
            errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
          }
        } catch (parseError) {
          logger.warn('Failed to parse error response:', parseError);
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Cache GET requests if caching is enabled for this endpoint
      if (method === 'GET') {
        const ttl = getCacheTTL(endpoint);
        if (ttl > 0) {
          requestCache.set(url, method, data, ttl);
        }
      }
      
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your internet connection and try again');
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network error - please check your internet connection and try again');
      }
      throw error;
    }
  }

  // Authentication methods
  async login(loginData) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData)
    });

    if (response.success && response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async register(registrationData) {
    // Create FormData for file upload if avatar is included
    let body;
    let headers = this.getAuthHeaders();
    
    if (registrationData.avatar instanceof File) {
      // Use FormData for file upload
      const formData = new FormData();
      Object.keys(registrationData).forEach(key => {
        if (key === 'avatar' && registrationData[key] instanceof File) {
          formData.append('avatar', registrationData[key]);
        } else if (registrationData[key] !== null && registrationData[key] !== undefined) {
          formData.append(key, registrationData[key]);
        }
      });
      body = formData;
      // Remove Content-Type header for FormData
      delete headers['Content-Type'];
    } else {
      // Use JSON for regular registration
      body = JSON.stringify(registrationData);
    }

    const url = `${this.baseURL}/auth/register`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage;
        try {
          const data = await response.json();
          errorMessage = data.message || `HTTP error! status: ${response.status}`;
        } catch (parseError) {
          logger.warn('Failed to parse error response:', parseError);
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your internet connection and try again');
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network error - please check your internet connection and try again');
      }
      throw error;
    }
  }

  // Update membership details
  async updateMembershipDetails(membershipData) {
    // Create FormData for file upload if selfiePhoto is included
    let body;
    let headers = this.getAuthHeaders();
    
    if (membershipData.selfiePhoto instanceof File) {
      // Use FormData for file upload
      const formData = new FormData();
      Object.keys(membershipData).forEach(key => {
        if (key === 'selfiePhoto' && membershipData[key] instanceof File) {
          formData.append('selfiePhoto', membershipData[key]);
        } else if (membershipData[key] !== null && membershipData[key] !== undefined) {
          formData.append(key, membershipData[key]);
        }
      });
      body = formData;
      // Remove Content-Type header for FormData
      delete headers['Content-Type'];
    } else {
      // Use JSON for regular data
      body = JSON.stringify(membershipData);
    }

    const url = `${this.baseURL}/auth/update-membership`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage;
        try {
          const data = await response.json();
          errorMessage = data.message || `HTTP error! status: ${response.status}`;
        } catch (parseError) {
          logger.warn('Failed to parse error response:', parseError);
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your internet connection and try again');
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network error - please check your internet connection and try again');
      }
      throw error;
    }
  }

  // Update booking details
  async updateBookingDetails(bookingDetails) {
    return this.request('/auth/update-booking', {
      method: 'POST',
      body: JSON.stringify({ bookingDetails })
    });
  }

  // Renew membership
  async renewMembership(bookingDetails) {
    return this.request('/auth/renew-membership', {
      method: 'POST',
      body: JSON.stringify({ bookingDetails })
    });
  }

  // Complete payment
  async completePayment(paymentId, paymentStatus) {
    return this.request('/auth/complete-payment', {
      method: 'POST',
      body: JSON.stringify({ paymentId, paymentStatus })
    });
  }

  // Create cash payment request
  async createCashPaymentRequest() {
    return this.request('/auth/create-cash-payment-request', {
      method: 'POST'
    });
  }

  // Get pending cash payments (Admin only)
  async getPendingCashPayments() {
    return this.request('/booking/pending-cash-payments');
  }

  // Confirm cash payment collection (Admin only)
  async confirmCashPayment(bookingId, userId, adminNotes = '') {
    return this.request('/booking/confirm-cash-payment', {
      method: 'POST',
      body: JSON.stringify({ 
        bookingId, 
        userId, 
        adminNotes,
        // For the old system, we need to pass user email for lookup
        userEmail: null // Will be determined by userId lookup in backend
      })
    });
  }

  // Upload avatar
  async uploadAvatar(avatarFile) {
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    const token = this.getToken();
    const url = `${this.baseURL}/auth/upload-avatar`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage;
        try {
          const data = await response.json();
          errorMessage = data.message || `HTTP error! status: ${response.status}`;
        } catch (parseError) {
          logger.warn('Failed to parse error response:', parseError);
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your internet connection and try again');
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network error - please check your internet connection and try again');
      }
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // Get member details
  async getMemberDetails() {
    return this.request('/member/details');
  }

  // Get member status
  async getMemberStatus() {
    return this.request('/member/status');
  }

  // Get booking details
  async getBookingDetails() {
    return this.request('/booking/details');
  }

  // Get booking status
  async getBookingStatus() {
    return this.request('/booking/status');
  }

  // Admin: aggregated users with bookings
  async getAdminUsersWithBookings(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/booking/all?${query}`);
  }

  // Admin: booking stats
  async getAdminBookingStats() {
    return this.request('/booking/admin/stats');
  }

  // Admin: export bookings/users CSV
  async downloadAdminExport(params = {}) {
    const query = new URLSearchParams(params).toString();
    const token = this.getToken();
    const url = `${this.baseURL}/booking/admin/export?${query}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error(`Export failed with status ${res.status}`);
      }
      const blob = await res.blob();
      return blob;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }

  // Admin: tour requests list
  async getTourRequests(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/tour/requests?${query}`);
  }

  // Admin: update tour status
  async updateTourStatus(id, payload) {
    return this.request(`/tour/requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.removeToken();
    }
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async refreshToken() {
    const response = await this.request('/auth/refresh', { method: 'POST' });
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  // OTP methods
  async sendOtp(emailOrData) {
    // Handle both string email and object with email property
    const data = typeof emailOrData === 'string' 
      ? { email: emailOrData } 
      : emailOrData;
    
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async verifyOtp(data) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Check if email exists
  async checkEmailExists(email) {
    return this.request('/auth/check-email', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  // Check if phone exists
  async checkPhoneExists(phoneNumber) {
    return this.request('/auth/check-phone', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber })
    });
  }

  // Forgot password methods
  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async verifyResetOtp(email, otp) {
    return this.request('/auth/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
  }

  async resetPassword(email, otp, newPassword) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword })
    });
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
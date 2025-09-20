const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
console.log('🔗 Frontend API Base URL:', API_BASE_URL);

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get auth token from localStorage
  getToken() {
    return localStorage.getItem('authToken');
  }

  // Set auth token in localStorage
  setToken(token) {
    localStorage.setItem('authToken', token);
  }

  // Remove auth token from localStorage
  removeToken() {
    localStorage.removeItem('authToken');
  }

  // Get auth headers
  getAuthHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Generic API request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    console.log('=== API SERVICE REQUEST ===');
    console.log('Base URL:', this.baseURL);
    console.log('Endpoint:', endpoint);
    console.log('Full URL:', url);
    console.log('Method:', options.method || 'GET');
    
    const config = {
      headers: this.getAuthHeaders(),
      timeout: 30000, // 30 second timeout
      ...options
    };

    try {
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
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
          console.log('=== API ERROR RESPONSE ===');
          console.log('Status:', response.status);
          console.log('Error data:', errorData);
          
          // If it's a validation error, include the validation details
          if (errorData.errors && Array.isArray(errorData.errors)) {
            console.log('Validation errors:', errorData.errors);
            const validationMessages = errorData.errors.map(err => `${err.path || err.param}: ${err.msg}`).join(', ');
            errorMessage = `${errorData.message || 'Validation failed'}: ${validationMessages}`;
          } else {
            errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
          }
        } catch {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
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
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
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
        } catch {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.success && data.token) {
        this.setToken(data.token);
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

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST'
      });
    } catch {
      // Silently handle logout errors
    } finally {
      this.removeToken();
    }
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  // Verify reset OTP
  async verifyResetOtp(email, otp) {
    return this.request('/auth/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
  }

  // Reset password
  async resetPassword(email, otp, newPassword) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword })
    });
  }

  // Note: Email checking is now handled by send-otp endpoint
  async checkEmailExists() {
    // In the new system, we don't need a separate check-email endpoint
    // The send-otp endpoint will return an error if email already exists
    return { exists: false }; // Always return false, let send-otp handle validation
  }

  async checkPhoneExists(phoneNumber) {
    return this.request('/auth/check-phone', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber })
    });
  }

  async sendOtp(email) {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async verifyOtp(email, otp) {
    // Clean the OTP - remove any whitespace and ensure it's a string
    const cleanOtp = String(otp).trim().replace(/\s+/g, '');
    
    console.log('=== API SERVICE VERIFY OTP DEBUG ===');
    console.log('Email:', email);
    console.log('OTP (original):', otp);
    console.log('OTP (cleaned):', cleanOtp);
    console.log('OTP length:', cleanOtp.length);
    console.log('OTP is numeric:', /^\d+$/.test(cleanOtp));
    console.log('Request payload:', { email, otp: cleanOtp });
    
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp: cleanOtp })
    });
  }

  // Handle OAuth callback
  handleOAuthCallback(token) {
    if (token) {
      this.setToken(token);
      return true;
    }
    return false;
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Check if token is properly formatted
      const parts = token.split('.');
      if (parts.length !== 3) {
        this.removeToken();
        return false;
      }

      // Check if token is expired (basic check)
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp <= currentTime) {
        console.log('Token expired, removing...');
        this.removeToken();
        return false;
      }
      
      return true;
    } catch (error) {
      console.log('Invalid token format, removing...', error);
      this.removeToken();
      return false;
    }
  }

  // Update membership details
  async updateMembershipDetails(membershipDetails) {
    // Create FormData for file upload
    const formData = new FormData();
    
    // Add all membership details to FormData
    Object.keys(membershipDetails).forEach(key => {
      if (key === 'selfiePhoto' && membershipDetails[key] instanceof File) {
        // Add file with correct field name expected by multer
        formData.append('selfiePhoto', membershipDetails[key]);
      } else if (membershipDetails[key] !== null && membershipDetails[key] !== undefined) {
        formData.append(key, membershipDetails[key]);
      }
    });

    // Use custom request for FormData (no Content-Type header)
    const token = this.getToken();
    const url = `${this.baseURL}/auth/update-membership`;
    
    const config = {
      method: 'POST',
      body: formData,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
        // Don't set Content-Type - let browser set it with boundary for FormData
      }
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage;
        try {
          const data = await response.json();
          errorMessage = data.message || `HTTP error! status: ${response.status}`;
        } catch {
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

  // Upload avatar
  async uploadAvatar(avatarFile) {
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    const token = this.getToken();
    const url = `${this.baseURL}/auth/upload-avatar`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
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
        } catch {
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
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
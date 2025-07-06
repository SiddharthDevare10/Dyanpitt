const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
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
    // In a real app, the backend would generate the Dyanpitt ID
    // and store all user data including email and dyanpittId mapping
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registrationData)
    });

    if (response.success && response.token) {
      this.setToken(response.token);
      
      // Store user data locally for demo purposes
      // In production, this would be handled by the backend
      localStorage.setItem('userData', JSON.stringify({
        email: registrationData.email,
        dyanpittId: registrationData.dyanpittId,
        fullName: registrationData.fullName,
        phoneNumber: registrationData.phoneNumber
      }));
    }

    return response;
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

  async checkEmailExists(email) {
    return this.request('/auth/check-email', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
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
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
  }

  // GitHub OAuth
  getGitHubAuthUrl() {
    return `${this.baseURL}/auth/github`;
  }

  // Handle GitHub OAuth callback
  handleGitHubCallback(token) {
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
      // Check if token is expired (basic check)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      this.removeToken();
      return false;
    }
  }

  // Update membership details
  async updateMembershipDetails(membershipDetails) {
    return this.request('/auth/update-membership', {
      method: 'POST',
      body: JSON.stringify({ membershipDetails })
    });
  }

  // Update booking details
  async updateBookingDetails(bookingDetails) {
    return this.request('/auth/update-booking', {
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

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
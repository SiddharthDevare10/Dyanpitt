// Simple console-based OTP service for development
class EmailService {
  constructor() {
    console.log('EmailService initialized in CONSOLE MODE - OTPs will be displayed in terminal');
  }

  async sendOTP(email, otp, fullName = '') {
    try {
      // Console-based OTP display
      console.log('\n' + '='.repeat(60));
      console.log('EMAIL VERIFICATION OTP');
      console.log('='.repeat(60));
      console.log(`Email: ${email}`);
      console.log(`Name: ${fullName || 'User'}`);
      console.log(`OTP Code: ${otp}`);
      console.log(`Valid for: 30 minutes`);
      console.log('='.repeat(60) + '\n');
      
      return { 
        success: true, 
        messageId: 'console-otp-' + Date.now(),
        isConsoleMode: true 
      };
    } catch (error) {
      console.error('Error displaying OTP:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(email, fullName, dyanpittId) {
    try {
      // Console-based welcome message
      console.log('\n' + '='.repeat(60));
      console.log('WELCOME TO DYANPITT!');
      console.log('='.repeat(60));
      console.log(`Name: ${fullName}`);
      console.log(`Email: ${email}`);
      console.log(`Dyanpitt ID: ${dyanpittId}`);
      console.log(`Registration completed successfully!`);
      console.log('='.repeat(60) + '\n');
      
      return { success: true, messageId: 'console-welcome-' + Date.now() };
    } catch (error) {
      console.error('Error displaying welcome message:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetOTP(email, otp, fullName = '') {
    try {
      // Console-based password reset OTP display
      console.log('\n' + '='.repeat(60));
      console.log('PASSWORD RESET OTP');
      console.log('='.repeat(60));
      console.log(`Email: ${email}`);
      console.log(`Name: ${fullName || 'User'}`);
      console.log(`Reset OTP Code: ${otp}`);
      console.log(`Valid for: 30 minutes`);
      console.log('='.repeat(60) + '\n');
      
      return { 
        success: true, 
        messageId: 'console-reset-otp-' + Date.now(),
        isConsoleMode: true 
      };
    } catch (error) {
      console.error('Error displaying password reset OTP:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
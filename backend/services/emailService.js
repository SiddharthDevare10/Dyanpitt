const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.mode = this.determineMode();
    
    if (this.mode === 'smtp') {
      try {
        this.transporter = this.createTransporter();
        console.log('EmailService initialized in SMTP MODE - Real emails will be sent');
      } catch (error) {
        console.error('Failed to initialize SMTP transporter:', error.message);
        console.log('Falling back to CONSOLE MODE');
        this.mode = 'console';
      }
    } else {
      console.log('EmailService initialized in CONSOLE MODE - OTPs will be displayed in terminal');
    }
  }

  determineMode() {
    // Check if SMTP credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      return 'smtp';
    }
    return 'console';
  }

  createTransporter() {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP credentials not provided');
    }

    const configs = {
      gmail: {
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      outlook: {
        service: 'hotmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      mailtrap: {
        host: 'smtp.mailtrap.io',
        port: 2525,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      custom: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      }
    };

    const provider = process.env.SMTP_PROVIDER || 'gmail';
    
    if (!configs[provider]) {
      throw new Error(`Unsupported SMTP provider: ${provider}`);
    }

    return nodemailer.createTransport(configs[provider]);
  }

  async sendOTP(email, otp, fullName = '') {
    if (this.mode === 'console') {
      return this.sendOTPConsole(email, otp, fullName);
    }
    return this.sendOTPSMTP(email, otp, fullName);
  }

  async sendOTPConsole(email, otp, fullName) {
    try {
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

  async sendOTPSMTP(email, otp, fullName) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Dyanpitt'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Email Verification - OTP Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Email Verification</h2>
            <p>Hello ${fullName || 'User'},</p>
            <p>Your OTP code for email verification is:</p>
            <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 4px;">${otp}</h1>
            </div>
            <p>This code will expire in 30 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this verification, please ignore this email.</p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully to:', email);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(email, fullName, dyanpittId) {
    if (this.mode === 'console') {
      return this.sendWelcomeEmailConsole(email, fullName, dyanpittId);
    }
    return this.sendWelcomeEmailSMTP(email, fullName, dyanpittId);
  }

  async sendWelcomeEmailConsole(email, fullName, dyanpittId) {
    try {
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

  async sendWelcomeEmailSMTP(email, fullName, dyanpittId) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Dyanpitt'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Welcome to Dyanpitt!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">Welcome to Dyanpitt!</h1>
            </div>
            <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
              <p style="font-size: 18px; color: #333;">Hello ${fullName},</p>
              <p>Congratulations! Your account has been successfully created and verified.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                <h3 style="margin-top: 0; color: #333;">Your Account Details:</h3>
                <p><strong>Dyanpitt ID:</strong> ${dyanpittId}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Status:</strong> <span style="color: #28a745;">Verified</span></p>
              </div>
              
              <p>You can now log in and start exploring our services. We're excited to have you on board!</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
                   style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Start Exploring
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; text-align: center;">
                Thank you for joining the Dyanpitt community!
              </p>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent successfully to:', email);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetOTP(email, otp, fullName = '') {
    if (this.mode === 'console') {
      return this.sendPasswordResetOTPConsole(email, otp, fullName);
    }
    return this.sendPasswordResetOTPSMTP(email, otp, fullName);
  }

  async sendPasswordResetOTPConsole(email, otp, fullName) {
    try {
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

  async sendPasswordResetOTPSMTP(email, otp, fullName) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Dyanpitt'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Password Reset - OTP Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">Password Reset Request</h2>
            </div>
            <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
              <p>Hello ${fullName || 'User'},</p>
              <p>You requested to reset your password. Your verification code is:</p>
              
              <div style="background: #fff3cd; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px solid #ffeaa7;">
                <h1 style="color: #856404; font-size: 32px; margin: 0; letter-spacing: 4px;">${otp}</h1>
              </div>
              
              <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; border-left: 4px solid #bee5eb;">
                <p style="margin: 0;"><strong>Important:</strong></p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>This code will expire in 30 minutes</li>
                  <li>Use this code only on the Dyanpitt website</li>
                  <li>Never share this code with anyone</li>
                </ul>
              </div>
              
              <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #f5c6cb;">
                <p style="margin: 0; color: #721c24;">
                  <strong>Didn't request this?</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                </p>
              </div>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent successfully to:', email);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }
  /**
   * Send registration complete email (without Dyanpitt ID)
   * @param {string} email - Recipient email
   * @param {string} fullName - User's full name
   * @returns {object} Result object
   */
  async sendRegistrationCompleteEmail(email, fullName) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@dyanpitt.com',
        to: email,
        subject: 'Registration Complete - Welcome to Dyanpitt!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Registration Complete, ${fullName}!</h2>
            <p>Your account has been successfully created.</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #007bff; margin: 0;">Next Steps</h3>
              <p style="margin: 10px 0;">Complete your membership and make your first payment to receive your Dyanpitt ID.</p>
            </div>
            <p>You can now login and complete your membership details.</p>
            <p>Thank you for joining Dyanpitt!</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Registration complete email sent successfully:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('Error sending registration complete email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new EmailService();
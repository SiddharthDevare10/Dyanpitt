const logger = require('../utils/logger');
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.mode = this.determineMode();
    
    if (this.mode === 'smtp') {
      try {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        
        // Verify connection
        this.transporter.verify((error, _success) => {
          if (error) {
            logger.error('SMTP connection failed:', error.message);
            logger.info('Falling back to CONSOLE MODE');
            this.mode = 'console';
          } else {
            logger.info('✅ EmailService initialized in SMTP MODE - Real emails will be sent');
            logger.info('📧 SMTP Host:', process.env.SMTP_HOST);
            logger.info('📤 From Email:', process.env.SMTP_FROM_EMAIL || 'not configured');
          }
        });
        
      } catch (error) {
        logger.error('Failed to initialize SMTP:', error.message);
        logger.info('Falling back to CONSOLE MODE');
        this.mode = 'console';
      }
    } else {
      logger.info('📺 EmailService initialized in CONSOLE MODE - OTPs and emails will be displayed in terminal');
      logger.info('ℹ️  To enable SMTP: Configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    }
  }

  determineMode() {
    // Check if SMTP configuration is provided
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    
    if (host && user && pass && 
        host !== 'your-smtp-host.com' && 
        user !== 'your-email@domain.com' && 
        pass !== 'your-password') {
      return 'smtp';
    }
    return 'console';
  }

  async sendOTP(email, otp, fullName = '') {
    if (this.mode === 'console') {
      return this.sendOTPConsole(email, otp, fullName);
    }
    
    if (this.mode === 'smtp') {
      // Try SMTP first, fallback to console if it fails
      const smtpResult = await this.sendOTPSMTP(email, otp, fullName);
      
      if (!smtpResult.success && smtpResult.error && 
          (smtpResult.error.includes('timeout') || smtpResult.error.includes('connection') || 
           smtpResult.error.includes('authentication'))) {
        logger.info('SMTP failed, falling back to console mode for this request');
        return this.sendOTPConsole(email, otp, fullName);
      }
      
      return smtpResult;
    }
  }

  async sendOTPConsole(email, otp, fullName) {
    try {
      logger.info('\n' + '='.repeat(60));
      logger.info('EMAIL VERIFICATION OTP');
      logger.info('='.repeat(60));
      logger.info(`Email: ${email}`);
      logger.info(`Name: ${fullName || 'User'}`);
      logger.info(`OTP Code: ${otp}`);
      logger.info(`Valid for: 30 minutes`);
      logger.info('='.repeat(60) + '\n');
      
      return { 
        success: true, 
        messageId: 'console-otp-' + Date.now(),
        isConsoleMode: true 
      };
    } catch (error) {
      logger.error('Error displaying OTP:', error);
      return { success: false, error: error.message };
    }
  }

  async sendOTPSMTP(email, otp, fullName) {
    try {
      logger.info('📧 Attempting to send OTP email via SMTP to:', email);
      
      const mailOptions = {
        from: {
          name: process.env.SMTP_FROM_NAME || 'Dyanpitt App',
          address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
        },
        to: email,
        subject: 'Email Verification - OTP Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">Email Verification</h1>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
              <p style="font-size: 18px; color: #333;">Hello ${fullName || 'User'},</p>
              <p>Your OTP code for email verification is:</p>
              <div style="background: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px solid #007bff;">
                <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 4px; font-weight: bold;">${otp}</h1>
              </div>
              <p style="color: #666;">This code will expire in <strong>30 minutes</strong>.</p>
              <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
                <p style="margin: 0; color: #0056b3;">
                  <strong>Security Note:</strong> Never share this code with anyone. We will never ask for your OTP via phone or email.
                </p>
              </div>
              <p style="color: #666; font-size: 14px;">If you didn't request this verification, please ignore this email.</p>
            </div>
          </div>
        `,
        text: `Hello ${fullName || 'User'},\n\nYour OTP code for email verification is: ${otp}\n\nThis code will expire in 30 minutes.\n\nIf you didn't request this verification, please ignore this email.`
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('✅ OTP email sent successfully via SMTP to:', email, 'MessageID:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('❌ Error sending OTP email via SMTP:', error);
      
      let userMessage = 'Failed to send OTP email';
      let errorMessage = error.message || 'Unknown error occurred';
      
      // Handle common SMTP errors
      if (errorMessage.includes('authentication') || errorMessage.includes('auth')) {
        userMessage = 'Email service authentication failed. Please check credentials.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        userMessage = 'Email sending timed out. Please check your internet connection and try again.';
      } else if (errorMessage.includes('connection') || errorMessage.includes('ECONNREFUSED')) {
        userMessage = 'Cannot connect to email server. Please check server settings.';
      } else if (errorMessage.includes('Invalid login')) {
        userMessage = 'Invalid email credentials. Please check username and password.';
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        userMessage = 'Email sending rate limit reached. Please try again later.';
      }
      
      return { success: false, error: errorMessage, userMessage };
    }
  }

  async sendWelcomeEmail(email, fullName, dyanpittId) {
    if (this.mode === 'console') {
      return this.sendWelcomeEmailConsole(email, fullName, dyanpittId);
    }
    if (this.mode === 'smtp') {
      return this.sendWelcomeEmailSMTP(email, fullName, dyanpittId);
    }
  }

  async sendWelcomeEmailConsole(email, fullName, dyanpittId) {
    try {
      logger.info('\n' + '='.repeat(60));
      logger.info('WELCOME TO DYANPITT!');
      logger.info('='.repeat(60));
      logger.info(`Name: ${fullName}`);
      logger.info(`Email: ${email}`);
      logger.info(`Dyanpitt ID: ${dyanpittId}`);
      logger.info(`Registration completed successfully!`);
      logger.info('='.repeat(60) + '\n');
      
      return { success: true, messageId: 'console-welcome-' + Date.now() };
    } catch (error) {
      logger.error('Error displaying welcome message:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmailSMTP(email, fullName, dyanpittId) {
    try {
      const mailOptions = {
        from: {
          name: process.env.SMTP_FROM_NAME || 'Dyanpitt App',
          address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
        },
        to: email,
        subject: 'Welcome to Dyanpitt! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to Dyanpitt!</h1>
            </div>
            <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
              <p style="font-size: 18px; color: #333;">Hello ${fullName},</p>
              <p>Congratulations! Your account has been successfully created and verified.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                <h3 style="margin-top: 0; color: #333;">Your Account Details:</h3>
                <p><strong>Dyanpitt ID:</strong> <span style="color: #28a745; font-weight: bold;">${dyanpittId}</span></p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Status:</strong> <span style="color: #28a745;">✅ Verified & Active</span></p>
              </div>
              
              <p>You can now log in and start exploring our services. We're excited to have you on board!</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
                   style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Start Exploring →
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; text-align: center;">
                Thank you for joining the Dyanpitt community! 🚀
              </p>
            </div>
          </div>
        `,
        text: `Hello ${fullName},\n\nCongratulations! Your account has been successfully created and verified.\n\nYour Account Details:\nDyanpitt ID: ${dyanpittId}\nEmail: ${email}\nStatus: Verified & Active\n\nYou can now log in and start exploring our services.\n\nThank you for joining the Dyanpitt community!`
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('✅ Welcome email sent successfully via SMTP to:', email, 'MessageID:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('❌ Error sending welcome email via SMTP:', error);
      
      let errorMessage = error.message || 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  async sendPasswordResetOTP(email, otp, fullName = '') {
    if (this.mode === 'console') {
      return this.sendPasswordResetOTPConsole(email, otp, fullName);
    }
    if (this.mode === 'smtp') {
      return this.sendPasswordResetOTPSMTP(email, otp, fullName);
    }
  }

  async sendPasswordResetOTPConsole(email, otp, fullName) {
    try {
      logger.info('\n' + '='.repeat(60));
      logger.info('PASSWORD RESET OTP');
      logger.info('='.repeat(60));
      logger.info(`Email: ${email}`);
      logger.info(`Name: ${fullName || 'User'}`);
      logger.info(`Reset OTP Code: ${otp}`);
      logger.info(`Valid for: 30 minutes`);
      logger.info('='.repeat(60) + '\n');
      
      return { 
        success: true, 
        messageId: 'console-reset-otp-' + Date.now(),
        isConsoleMode: true 
      };
    } catch (error) {
      logger.error('Error displaying password reset OTP:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetOTPSMTP(email, otp, fullName) {
    try {
      const mailOptions = {
        from: {
          name: process.env.SMTP_FROM_NAME || 'Dyanpitt App',
          address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
        },
        to: email,
        subject: 'Password Reset - Security Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">🔐 Password Reset Request</h2>
            </div>
            <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
              <p>Hello ${fullName || 'User'},</p>
              <p>You requested to reset your password. Your verification code is:</p>
              
              <div style="background: #fff3cd; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px solid #ffc107;">
                <h1 style="color: #856404; font-size: 32px; margin: 0; letter-spacing: 4px; font-weight: bold;">${otp}</h1>
              </div>
              
              <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; border-left: 4px solid #0dcaf0;">
                <p style="margin: 0;"><strong>⚠️ Important Security Information:</strong></p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>This code will expire in <strong>30 minutes</strong></li>
                  <li>Use this code only on the Dyanpitt website</li>
                  <li>Never share this code with anyone</li>
                </ul>
              </div>
              
              <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #dc3545;">
                <p style="margin: 0; color: #721c24;">
                  <strong>⚠️ Didn't request this?</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                </p>
              </div>
            </div>
          </div>
        `,
        text: `Hello ${fullName || 'User'},\n\nYou requested to reset your password. Your verification code is: ${otp}\n\nImportant:\n- This code will expire in 30 minutes\n- Use this code only on the Dyanpitt website\n- Never share this code with anyone\n\nIf you didn't request this, please ignore this email.`
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('✅ Password reset email sent successfully via SMTP to:', email, 'MessageID:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('❌ Error sending password reset email via SMTP:', error);
      
      let errorMessage = error.message || 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send registration complete email (without Dyanpitt ID)
   * @param {string} email - Recipient email
   * @param {string} fullName - User's full name
   * @returns {object} Result object
   */
  async sendRegistrationCompleteEmail(email, fullName) {
    if (this.mode === 'console') {
      return this.sendRegistrationCompleteEmailConsole(email, fullName);
    }
    if (this.mode === 'smtp') {
      return this.sendRegistrationCompleteEmailSMTP(email, fullName);
    }
  }

  async sendRegistrationCompleteEmailConsole(email, fullName) {
    try {
      logger.info('\n' + '='.repeat(60));
      logger.info('REGISTRATION COMPLETE');
      logger.info('='.repeat(60));
      logger.info(`Name: ${fullName}`);
      logger.info(`Email: ${email}`);
      logger.info(`Status: Account created successfully`);
      logger.info(`Next Step: Complete membership and payment to receive Dyanpitt ID`);
      logger.info('='.repeat(60) + '\n');
      
      return {
        success: true,
        messageId: 'console-registration-' + Date.now()
      };
    } catch (error) {
      logger.error('Error displaying registration complete message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendRegistrationCompleteEmailSMTP(email, fullName) {
    try {
      const mailOptions = {
        from: `"Dyanpitt App" <${process.env.SMTP_FROM_EMAIL}>`,
        to: email,
        subject: 'Registration Complete - Welcome to Dyanpitt!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 24px;">✅ Registration Complete!</h2>
            </div>
            <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
              <p style="font-size: 18px; color: #333;">Hello ${fullName},</p>
              <p>Your account has been successfully created and verified!</p>
              
              <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                <h3 style="color: #007bff; margin: 0 0 10px 0;">🎯 Next Steps</h3>
                <p style="margin: 0;">Complete your membership details and make your first payment to receive your unique Dyanpitt ID.</p>
              </div>
              
              <p>You can now login and complete your membership registration.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
                   style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Complete Your Membership →
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666;">
                <p>If you have any questions, feel free to contact our support team.</p>
                <p style="margin: 0;">Best regards,<br>The Dyanpitt Team</p>
              </div>
            </div>
          </div>
        `,
        text: `
Hello ${fullName},

Your account has been successfully created and verified!

🎯 Next Steps:
Complete your membership details and make your first payment to receive your unique Dyanpitt ID.

You can now login and complete your membership registration.

Visit: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/login

If you have any questions, feel free to contact our support team.

Best regards,
The Dyanpitt Team
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`✅ Registration complete email sent via SMTP to: ${email} MessageID: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error('❌ Error sending registration complete email via SMTP:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendRegistrationCompleteEmailMailerSend(email, fullName) {
    try {
      // Note: MailerSend integration is not implemented yet
      // These classes would need to be imported from @mailersend/nodejs
      logger.info('MailerSend registration email would be sent to:', email, fullName);
      return { success: true, message: 'Email logged to console (MailerSend not configured)' };
      
      // Commented out until MailerSend is properly configured:
      /*
      const sentFrom = new Sender(
        process.env.MAILERSEND_FROM_EMAIL || 'noreply@yourdomain.com',
        process.env.MAILERSEND_FROM_NAME || 'Dyanpitt App'
      );
      
      const recipients = [new Recipient(email, fullName)];
      
      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject('Registration Complete - Welcome to Dyanpitt!')
        .setHtml(`
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 24px;">✅ Registration Complete!</h2>
            </div>
            <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
              <p style="font-size: 18px; color: #333;">Hello ${fullName},</p>
              <p>Your account has been successfully created and verified!</p>
              
              <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                <h3 style="color: #007bff; margin: 0 0 10px 0;">🎯 Next Steps</h3>
                <p style="margin: 0;">Complete your membership details and make your first payment to receive your unique Dyanpitt ID.</p>
              </div>
              
              <p>You can now login and complete your membership registration.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
                   style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Complete Your Membership →
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; text-align: center;">
                Thank you for choosing Dyanpitt! 🙏
              </p>
            </div>
          </div>
        `)
        .setText(`Hello ${fullName},\n\nYour account has been successfully created and verified!\n\nNext Steps:\nComplete your membership details and make your first payment to receive your unique Dyanpitt ID.\n\nYou can now login and complete your membership registration.\n\nThank you for choosing Dyanpitt!`);

      const result = await this.mailerSend.email.send(emailParams);
      logger.info('Registration complete email sent successfully via MailerSend to:', email, 'ID:', result.body?.message_id);
      return { success: true, messageId: result.body?.message_id };
      */
    } catch (error) {
      logger.error('Error sending registration complete email via MailerSend:', error);
      return { success: false, error: 'MailerSend not configured' };
    }
  }

  /**
   * Send feedback email after tour completion
   * @param {string} email - Recipient email
   * @param {string} fullName - User's full name
   * @returns {object} Result object
   */
  async sendFeedbackEmail(email, fullName) {
    if (this.mode === 'console') {
      return this.sendFeedbackEmailConsole(email, fullName);
    }
    if (this.mode === 'smtp') {
      return this.sendFeedbackEmailSMTP(email, fullName);
    }
  }

  async sendFeedbackEmailConsole(email, fullName) {
    try {
      logger.info('\n' + '='.repeat(60));
      logger.info('TOUR FEEDBACK REQUEST');
      logger.info('='.repeat(60));
      logger.info(`Email: ${email}`);
      logger.info(`Name: ${fullName}`);
      logger.info(`Message: Tour completed - Feedback requested`);
      logger.info(`Feedback Email: feedback@dnyanpeethabhyasika.com`);
      logger.info('='.repeat(60) + '\n');
      
      return { 
        success: true, 
        messageId: 'console-feedback-' + Date.now(),
        isConsoleMode: true 
      };
    } catch (error) {
      logger.error('Error displaying feedback request:', error);
      return { success: false, error: error.message };
    }
  }

  async sendFeedbackEmailMailerSend(email, fullName) {
    try {
      // Note: MailerSend integration is not implemented yet
      // These classes would need to be imported from @mailersend/nodejs
      logger.info('MailerSend feedback email would be sent to:', email, fullName);
      return { success: true, message: 'Email logged to console (MailerSend not configured)' };
      
      // Commented out until MailerSend is properly configured:
      /*
      const sentFrom = new Sender(
        process.env.MAILERSEND_FROM_EMAIL || 'noreply@yourdomain.com',
        process.env.MAILERSEND_FROM_NAME || 'Dyanpitt App'
      );
      
      const recipients = [new Recipient(email, fullName)];
      
      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject('Thank you for visiting! Share your feedback 📝')
        .setHtml(`
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1a365d; margin: 0; font-size: 28px;">🏢 Dnyanpeeth Abhyasika</h1>
                <p style="color: #666; margin: 5px 0 0 0; font-size: 16px;">Thank you for visiting us!</p>
              </div>
              
              <div style="margin-bottom: 30px;">
                <h2 style="color: #1a365d; margin-bottom: 15px;">Dear ${fullName},</h2>
                <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
                  Thank you for taking the time to visit Dnyanpeeth Abhyasika today. We hope you found our facilities and environment conducive to your study goals.
                </p>
                <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
                  Your feedback is invaluable to us as we continuously strive to improve our services and create the best possible study environment for our members.
                </p>
              </div>

              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <h3 style="color: #1a365d; margin-top: 0; margin-bottom: 15px;">📝 Please share your feedback:</h3>
                <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>How was your overall experience during the tour?</li>
                  <li>What did you like most about our facilities?</li>
                  <li>Are there any areas where we can improve?</li>
                  <li>Would you recommend Dnyanpeeth Abhyasika to others?</li>
                  <li>Any additional comments or suggestions?</li>
                </ul>
              </div>

              <div style="text-align: center; margin-bottom: 30px;">
                <a href="mailto:feedback@dnyanpeethabhyasika.com?subject=Feedback%20after%20Tour%20Visit&body=Dear%20Dnyanpeeth%20Abhyasika%20Team,%0A%0AThank%20you%20for%20the%20tour.%20Here%20is%20my%20feedback:%0A%0A1.%20Overall%20experience:%0A%0A2.%20What%20I%20liked%20most:%0A%0A3.%20Areas%20for%20improvement:%0A%0A4.%20Would%20I%20recommend:%0A%0A5.%20Additional%20comments:%0A%0ABest%20regards,%0A${fullName}" 
                   style="display: inline-block; background-color: #1a365d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  📧 Share Your Feedback
                </a>
              </div>

              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
                <p style="color: #666; font-size: 14px; margin: 0;">
                  If you have any questions or would like to proceed with membership, please contact us:
                </p>
                <p style="color: #1a365d; font-weight: bold; margin: 10px 0 0 0;">
                  📞 Phone: +91-XXXXXXXXXX | 📧 Email: info@dnyanpeethabhyasika.com
                </p>
              </div>
            </div>
          </div>
        `)
        .setText(`Dear ${fullName},\n\nThank you for visiting Dnyanpeeth Abhyasika today. We hope you found our facilities conducive to your study goals.\n\nPlease share your feedback:\n- How was your overall experience?\n- What did you like most about our facilities?\n- Any areas for improvement?\n- Would you recommend us to others?\n- Additional comments?\n\nReply to this email with your feedback.\n\nContact: info@dnyanpeethabhyasika.com`);

      const result = await this.mailerSend.email.send(emailParams);
      logger.info('Feedback email sent successfully via MailerSend to:', email, 'ID:', result.body?.message_id);
      return { success: true, messageId: result.body?.message_id };
      */
    } catch (error) {
      logger.error('Error sending feedback email via MailerSend:', error);
      return { success: false, error: 'MailerSend not configured' };
    }
  }
}

module.exports = new EmailService();
const nodemailer = require('nodemailer');
require('dotenv').config({ path: './backend/.env' });

async function testSMTP() {
  console.log('🔧 Testing SMTP Configuration...\n');
  
  console.log('📋 Current Configuration:');
  console.log(`SMTP_PROVIDER: ${process.env.SMTP_PROVIDER}`);
  console.log(`SMTP_USER: ${process.env.SMTP_USER}`);
  console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '[SET]' : '[NOT SET]'}`);
  console.log(`SMTP_FROM: ${process.env.SMTP_FROM}`);
  console.log('');

  // Create transporter
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    console.log('🔍 Step 1: Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    console.log('📧 Step 2: Sending test email...');
    const testEmail = {
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to yourself for testing
      subject: 'SMTP Test - Password Reset Functionality',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">SMTP Test Successful!</h2>
          <p>This email confirms that your SMTP configuration is working correctly.</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 4px;">123456</h1>
            <p style="margin: 10px 0 0 0; color: #666;">Sample OTP Code</p>
          </div>
          <p>Your password reset functionality should now work properly.</p>
          <p style="color: #666; font-size: 14px;">Test completed at: ${new Date().toISOString()}</p>
        </div>
      `
    };

    const result = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`📬 Check your inbox: ${process.env.SMTP_USER}\n`);
    
    console.log('🎉 SMTP is working correctly! Password reset should now function properly.');
    
  } catch (error) {
    console.log('❌ SMTP Test Failed!\n');
    console.log('🔍 Error Details:');
    console.log(`Code: ${error.code}`);
    console.log(`Message: ${error.message}`);
    
    if (error.code === 'EAUTH') {
      console.log('\n🚨 Authentication Error - Possible Solutions:');
      console.log('1. 🔑 Generate a new Gmail App Password:');
      console.log('   - Go to: https://myaccount.google.com/security');
      console.log('   - Enable 2-Step Verification if not already enabled');
      console.log('   - Go to App Passwords section');
      console.log('   - Generate new password for "Mail" application');
      console.log('   - Use the 16-character password (no spaces)');
      console.log('');
      console.log('2. ✅ Verify your Gmail account settings:');
      console.log('   - Ensure 2FA is enabled');
      console.log('   - Ensure "Less secure app access" is NOT needed (App Passwords are secure)');
      console.log('');
      console.log('3. 🔄 Update your .env file with the new App Password');
    }
    
    console.log('\n📝 Current password format check:');
    const pass = process.env.SMTP_PASS;
    console.log(`Length: ${pass ? pass.length : 0} characters`);
    console.log(`Has spaces: ${pass ? pass.includes(' ') : false}`);
    console.log(`Expected: 16 characters, no spaces`);
  }
}

testSMTP();
# SMTP Email Setup Guide

## Quick Setup Steps

### 1. Choose Your Email Provider

**Gmail (Recommended for development):**
- ✅ Free and reliable
- ✅ Easy to set up with App Passwords
- ✅ Good deliverability

**Other providers:**
- Outlook/Hotmail: `smtp-mail.outlook.com:587`
- Yahoo: `smtp.mail.yahoo.com:587`
- Custom domain: Check your hosting provider

### 2. Gmail Setup (Most Common)

#### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled

#### Step 2: Create App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Other (Custom name)"
3. Enter "Dyanpitt App" as the name
4. Copy the 16-character password generated

#### Step 3: Configure Environment Variables
Add to your `backend/.env` file:

```bash
# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM_EMAIL=your-gmail@gmail.com
SMTP_FROM_NAME=Dyanpitt App
```

### 3. Other Email Providers

#### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### Yahoo Mail
```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

#### Custom Domain/Business Email
```bash
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-password
```

### 4. Test Configuration

Run the backend and look for:
```
✅ EmailService initialized in SMTP MODE - Real emails will be sent
📧 SMTP Host: smtp.gmail.com
📤 From Email: your-email@gmail.com
```

## Benefits of SMTP

✅ **Universal**: Works with any email provider  
✅ **No API limits**: No trial restrictions  
✅ **Cost-effective**: Use existing email accounts  
✅ **Reliable**: Direct SMTP connection  
✅ **No vendor lock-in**: Switch providers easily  
✅ **Simple setup**: Just username and password  

## Common SMTP Settings

| Provider | SMTP Host | Port | Secure |
|----------|-----------|------|--------|
| Gmail | smtp.gmail.com | 587 | false |
| Outlook | smtp-mail.outlook.com | 587 | false |
| Yahoo | smtp.mail.yahoo.com | 587 | false |
| iCloud | smtp.mail.me.com | 587 | false |

## Troubleshooting

### Authentication Failed
- **Gmail**: Make sure you're using App Password, not regular password
- **Other providers**: Check if 2FA is enabled and app passwords are required

### Connection Refused
- Check SMTP host and port settings
- Ensure firewall isn't blocking outbound SMTP connections
- Try port 465 with `SMTP_SECURE=true` for SSL

### Emails Going to Spam
- Use your real email as FROM address
- Add SPF/DKIM records for custom domains
- Start with low volume sending

### Rate Limiting
- Gmail: ~100 emails/day for free accounts, 2000/day for Google Workspace
- Most providers have similar limits for free accounts

## Security Best Practices

### 🔒 Use App Passwords
- Never use your main email password
- Generate specific app passwords for applications

### 🔒 Environment Variables
- Keep credentials in `.env` files
- Never commit credentials to git
- Use different credentials for different environments

### 🔒 Rate Limiting
- Implement sending delays for bulk emails
- Monitor bounce rates and spam complaints

## Production Recommendations

### For High Volume (1000+ emails/day)
Consider dedicated email services:
- **SendGrid**: 100 emails/day free, then paid plans
- **AWS SES**: $0.10 per 1000 emails
- **Mailgun**: 5000 emails/month free

### For Medium Volume (100-1000 emails/day)
- Google Workspace: $6/user/month, 2000 emails/day
- Microsoft 365: Similar limits and pricing

### For Low Volume (< 100 emails/day)
- Personal Gmail/Outlook accounts work perfectly
- Current SMTP setup is ideal

## Email Templates

The integration includes:
- ✉️ OTP verification emails with modern design
- 🎉 Welcome emails with account details
- 🔐 Password reset emails with security warnings
- 📧 Registration complete emails
- 📝 Tour feedback request emails
- 📱 All emails are mobile-responsive

## Migration from MailerSend

✅ **Already completed!** The system now uses SMTP instead of MailerSend.

Benefits of the switch:
- No trial account limitations
- No API token management
- Works with any email provider
- Simpler configuration
- More reliable for development

## Next Steps

1. **Development**: Configure with your Gmail account for testing
2. **Staging**: Use a dedicated email account for staging environment
3. **Production**: Consider dedicated email service for high volume or use business email account

Your email service is now more flexible and reliable than before!
# Dyanpitt Frontend Application

## 🏗️ Architecture Overview

This React application provides the frontend for the Dyanpitt study room booking system.

### 📁 Directory Structure
```
src/
├── components/          # Reusable UI components
├── contexts/           # React context providers
├── screens/            # Page components
│   ├── admin/         # Admin-only screens
│   ├── shared/        # Auth screens (login, register)
│   └── user/          # User screens
├── services/          # API service layer
├── utils/             # Utility functions
└── styles/            # CSS files
```

### 🔧 Key Features

- **Authentication**: JWT-based auth with automatic token refresh
- **Progressive Registration**: Multi-step user onboarding
- **File Uploads**: Image processing with compression
- **Error Handling**: Global error boundary with graceful fallbacks
- **Performance**: Code splitting and request caching
- **Security**: Input sanitization and XSS protection

### 🛡️ Security Features

- Input sanitization and XSS protection
- Secure token validation
- CORS configuration
- Rate limiting protection
- File upload validation

### 📱 User Flow

1. **Registration**: Email verification → Profile setup
2. **Membership**: Background info → Document upload  
3. **Booking**: Room selection → Payment
4. **Dashboard**: QR code → Membership management

### 🔄 State Management

- **AuthContext**: User authentication state
- **Local Storage**: Token persistence
- **Request Cache**: API response caching

### 🚀 Performance Optimizations

- Lazy loading with React.lazy()
- Request caching with TTL
- Image compression
- Code splitting by routes

## 🛠️ Development Setup

See main README.md for setup instructions.
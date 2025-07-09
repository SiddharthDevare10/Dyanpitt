# Network Setup Guide - Ubuntu Hosting

## Overview
This guide explains how to host the Dyanpitt app from your Ubuntu PC and make it accessible from other devices on your network.

## Prerequisites
- ✅ Node.js and npm installed
- ✅ MongoDB installed and running
- ✅ Ubuntu PC with IP: 10.178.165.20

## Configuration Changes Made

### 1. Vite Configuration (vite.config.js)
Added network access configuration:
```javascript
server: {
  host: '0.0.0.0', // Allow external connections
  port: 5173,
  strictPort: true
}
```

### 2. Backend CORS Configuration (backend/server.js)
Added your network IP to allowed origins:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://10.178.165.20:5173', // Your Ubuntu PC's network IP
  process.env.FRONTEND_URL
].filter(Boolean);
```

### 3. Backend Server Binding (backend/server.js)
Made server listen on all network interfaces:
```javascript
app.listen(PORT, '0.0.0.0', () => {
  // Server startup logs
});
```

### 4. Environment Variables Updated
- **Frontend (.env)**: `VITE_API_URL=http://10.178.165.20:5000/api`
- **Backend (backend/.env)**: `FRONTEND_URL=http://10.178.165.20:5173`

## 🚀 How to Start the Application

### Option A: Development Mode (Recommended)

**Terminal 1 - Start Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Start Frontend:**
```bash
npm run dev
```

### Option B: Production Mode

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
npm run build
npm run preview
```

## 🌐 Access URLs

### From Your Ubuntu PC:
- **Frontend (dev)**: http://localhost:5173 or http://10.178.165.20:5173
- **Frontend (preview)**: http://localhost:4173 or http://10.178.165.20:4173
- **Backend API**: http://localhost:5000/api or http://10.178.165.20:5000/api
- **Health Check**: http://localhost:5000/api/health

### From Other Devices on Network:
- **Frontend (dev)**: http://10.178.165.20:5173
- **Frontend (preview)**: http://10.178.165.20:4173
- **Backend API**: http://10.178.165.20:5000/api

## 🔥 Firewall Configuration

If other devices can't connect, open the required ports:

```bash
# Allow frontend ports
sudo ufw allow 5173  # Development server
sudo ufw allow 4173  # Preview server

# Allow backend port
sudo ufw allow 5000

# Check firewall status
sudo ufw status
```

## 📱 Testing Network Access

1. **Start both servers** using the commands above
2. **From another device** on the same network, open a web browser
3. **Navigate to**: http://10.178.165.20:5173
4. **Test the app** - registration, login, etc.

## 🛠️ Troubleshooting

### Can't Access from Other Devices?
1. Check if firewall is blocking ports (see firewall section above)
2. Verify your IP address: `hostname -I | awk '{print $1}'`
3. Ensure both devices are on the same network
4. Try accessing the health check endpoint: http://10.178.165.20:5000/api/health

### MongoDB Connection Issues?
```bash
# Check MongoDB status
sudo systemctl status mongod

# Start MongoDB if not running
sudo systemctl start mongod

# Enable MongoDB to start on boot
sudo systemctl enable mongod
```

### Port Already in Use?
```bash
# Check what's using port 5173
sudo lsof -i :5173

# Check what's using port 5000
sudo lsof -i :5000

# Kill process if needed
sudo kill -9 <PID>
```

## 📋 Quick Start Checklist

- [ ] Dependencies installed (`npm install` in both root and backend)
- [ ] Environment files configured (`.env` and `backend/.env`)
- [ ] MongoDB running (`sudo systemctl start mongod`)
- [ ] Firewall ports opened (`sudo ufw allow 5173 5000`)
- [ ] Backend server started (`cd backend && npm run dev`)
- [ ] Frontend server started (`npm run dev`)
- [ ] Test local access: http://localhost:5173
- [ ] Test network access: http://10.178.165.20:5173

## 🔧 Additional Configuration Options

### Custom Domain (Optional)
To use a custom domain instead of IP:
1. Edit `/etc/hosts` on each device
2. Add: `10.178.165.20 myapp.local`
3. Update environment variables to use `myapp.local`

### HTTPS Setup (Optional)
For HTTPS access, you'll need to:
1. Generate SSL certificates
2. Configure Vite and Express for HTTPS
3. Update all URLs to use `https://`

## 📞 Support

If you encounter issues:
1. Check the console logs in both terminals
2. Verify network connectivity between devices
3. Ensure all configuration changes are saved
4. Restart both servers after making changes

---
**Note**: This configuration is for development/local network use. For production deployment, additional security measures and proper SSL certificates are recommended.
# 🚀 Dyanpitt App

Simple React + Node.js application with clean development workflow.

## 🔧 Development

Prerequisite: Node.js 20.19+
- Use nvm: `nvm install` then `nvm use` (project contains .nvmrc)
- Verify: `node -v` should print v20.19.0 or newer 20.x

### **First Time Setup**
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install
cd ..
```

### **Start Development**
```bash
# Start both frontend and backend
npm run dev:full

# Or start separately:
npm run dev                    # Frontend only (localhost:5173)
cd backend && npm run dev      # Backend only (localhost:5000)
```

### **Environment Files**
- **Frontend**: `.env` (already configured)
- **Backend**: `backend/.env` (already configured)

## 🏗️ Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
dyanpitt-app/
├── src/                    # React frontend
├── backend/               # Node.js backend
├── .env                   # Frontend environment
├── backend/.env           # Backend environment
└── package.json           # Frontend dependencies
```

## 🚀 Deployment

See CSP_VERCEL_GUIDE.md for setting a secure Content Security Policy (CSP) on your frontend host in production.

When ready to deploy:
1. Build works locally: `npm run build`
2. Push to GitHub
3. Deploy frontend to Vercel
4. Deploy backend to Railway

## 🔧 Commands

```bash
npm run dev:full          # Start both frontend + backend
npm run dev               # Frontend only
npm run build             # Build for production
npm run preview           # Preview production build
npm run lint              # Check code quality
npm run clean             # Clean build files
```

That's it! Simple and clean. 🎯
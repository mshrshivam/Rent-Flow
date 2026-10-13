# Quick Reference - MongoDB App Setup

## 🚀 Quick Start

### Terminal 1: Start Backend (Port 4000)
```bash
cd server
node index.js
```

Expected output:
```
Connected to MongoDB
Server listening on port 4000
```

### Terminal 2: Start Frontend (Port 5174)
```bash
npx vite
```

Expected output:
```
VITE v7.3.1 ready in xxxx ms
➜  Local:   http://localhost:5174/
```

### 3. Open Browser
Visit: **http://localhost:5174**

## 👤 Test Login

| Email | Password |
|-------|----------|
| owner@test.com | password123 |
| manager@test.com | password123 |
| tenant@test.com | password123 |

## 📁 Project Structure

```
nest-flow-prime-main/
├── src/                    # Frontend React code
│   ├── contexts/          # AuthContext (API-based)
│   ├── lib/               # Service modules (messageService, propertyService, etc)
│   ├── pages/             # Dashboard, Properties, Messages, etc
│   └── components/        # UI components
│
├── server/                # Backend Express app
│   ├── index.js          # Main server file with all routes
│   ├── package.json      # Dependencies
│   └── .env              # MongoDB URI
│
├── .env                   # Frontend env (empty now!)
├── package.json           # Frontend dependencies
└── MIGRATION_COMPLETE.md  # This migration guide
```

## 🔗 API Endpoints Quick Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/signup` | Create account |
| GET | `/api/properties?ownerId=...` | List properties |
| POST | `/api/properties` | Create property |
| GET | `/api/units?propertyId=...` | List units |
| POST | `/api/units` | Create unit |
| GET | `/api/tenants?ownerId=...` | List tenants |
| POST | `/api/tenants` | Create tenant |
| GET | `/api/messages?conversationId=...` | Get messages |
| POST | `/api/messages` | Send message |
| POST | `/api/payments` | Record payment |
| GET | `/api/payments?tenantId=...` | List payments |

## 🔧 Environment Variables

### Frontend (.env)
Empty! Firebase is gone.

### Backend (server/.env)
```
MONGODB_URI=mongodb+srv://...
DB_NAME=appdb
PORT=4000
```

## ❌ Troubleshooting

### Port 4000 in use?
```bash
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### MongoDB won't connect?
1. Verify connection string in `server/.env`
2. Check MongoDB Atlas network access
3. Ensure your IP is whitelisted

### Build errors?
```bash
npm install
npm run build
```

## 📊 Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (bundler)
- TailwindCSS (styling)
- React Query (data fetching)
- React Router (routing)

**Backend:**
- Node.js + Express
- MongoDB (Atlas)
- bcryptjs (password hashing)
- CORS enabled

## 🎯 What's Different Now?

### Before (Firebase)
```typescript
import { firebaseDb } from '@/integrations/firebase/init';
const data = await getDocs(collection(firebaseDb, 'properties'));
```

### After (API)
```typescript
const res = await fetch('/api/properties?ownerId=...');
const data = await res.json();
```

## ✅ Services Updated

All these now use REST API instead of Firebase:
- ✅ AuthContext.tsx
- ✅ messageService.ts
- ✅ propertyService.ts
- ✅ paymentService.ts
- ✅ maintenanceService.ts

## 📱 Testing Workflow

1. **Login**
   - Use owner@test.com / password123
   - See dashboard with mock data initially

2. **Create Property**
   - Go to Properties page
   - Click "Add Property"
   - Fill form and submit
   - See property in list (saved to MongoDB)

3. **Add Unit**
   - Click on property
   - Click "Add Unit"
   - Fill form and submit

4. **Add Tenant**
   - Go to Tenants page
   - Click "Add Tenant"
   - See tenant listed

5. **Send Message**
   - Go to Messages
   - Select/create conversation
   - Send message
   - See message history

## 🎓 Architecture Overview

```
User Browser
    ↓
Vite Dev Server (5174)
    ↓
React App
    ↓
Fetch API Calls
    ↓
Express Server (4000)
    ↓
MongoDB Collection Operations
    ↓
MongoDB Atlas Cloud
```

## 📝 Common Errors and Fixes

| Error | Solution |
|-------|----------|
| "Cannot POST /api/auth/login" | Start backend server first |
| "MongoDB connection failed" | Check connection string in .env |
| "EADDRINUSE: address already in use :::4000" | Kill process on port 4000 |
| "Module not found: firebase" | Firebase is removed - error gone after rebuild |
| "Cannot find module axios" | Use fetch instead (no axios needed) |

## 🚀 Production Deployment

### Backend Deployment (Heroku example)
```bash
# Add Procfile
echo "web: node server/index.js" > Procfile

# Deploy
git push heroku main
```

### Frontend Deployment (Vercel example)
```bash
npm run build
vercel deploy
```

### Update API URL for Production
In production, change:
```typescript
// From localhost
fetch('/api/...')

// To production URL
fetch('https://your-api.com/api/...')
```

## 📞 Support

Check these files for full documentation:
- `MONGODB_SETUP.md` - Detailed setup guide
- `MIGRATION_COMPLETE.md` - Full migration details
- `server/index.js` - All endpoints documented
- `src/lib/*Service.ts` - How each service works

## 🎉 You're All Set!

The app is now running with:
✅ MongoDB database in the cloud
✅ Express backend with REST API
✅ React frontend consuming the API
✅ No Firebase/Supabase dependencies
✅ Proper authentication with hashed passwords

**Happy coding!** 🚀

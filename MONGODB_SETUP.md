# MongoDB + Express Backend Setup

Your app is now fully configured to use **MongoDB Atlas + Express API** instead of Firebase/Supabase!

## ✅ Completed Setup

- ✅ Express server created with MongoDB integration
- ✅ Frontend services updated to use REST API endpoints
- ✅ Firebase package removed and dependencies cleaned
- ✅ AuthContext rewritten to use API authentication
- ✅ Environment variables configured for MongoDB

## 📋 Server Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

### Properties
- `GET /api/properties?ownerId=...` - List properties
- `POST /api/properties` - Create property
- `PATCH /api/properties` - Update property
- `DELETE /api/properties?id=...` - Delete property

### Units
- `GET /api/units?propertyId=...` - List units
- `POST /api/units` - Create unit

### Tenancies & Tenants
- `GET /api/tenancies?ownerId=...` - List tenancies
- `GET /api/tenants?ownerId=...` - List tenants
- `POST /api/tenants` - Create tenant + tenancy

### Messages & Conversations
- `GET /api/conversations?userId=...` - List conversations
- `POST /api/conversations` - Create conversation
- `GET /api/messages?conversationId=...` - List messages
- `POST /api/messages` - Send message

### Payments
- `GET /api/payments?tenantId=...` - List payments
- `POST /api/payments` - Create payment
- `PATCH /api/payments` - Update payment

### Maintenance
- `GET /api/maintenance?userId=...` - List maintenance requests
- `POST /api/maintenance` - Create maintenance request

## 🚀 Running the Server

### Option 1: Using Node.js directly

```bash
cd server
npm install
node index.js
```

The server will run on `http://localhost:4000`

### Option 2: Using nodemon (auto-restart on changes)

```bash
cd server
npm install -g nodemon
nodemon index.js
```

## 🔧 Environment Configuration

### Server (.env in root directory)

The server needs these environment variables:

```env
MONGODB_URI=mongodb+srv://airbnb:password@cluster.mongodb.net/?retryWrites=true
DB_NAME=appdb
PORT=4000
```

Your MongoDB URI is already configured in `server/.env`

### Frontend (.env in root directory)

Frontend is now configured to call the local API:

```
# No need for Firebase credentials anymore!
# API calls go to http://localhost:4000
```

## 📦 Services Updated

All frontend service modules now use fetch-based API calls:

- `src/lib/authContext.tsx` - Uses `/api/auth/`
- `src/lib/messageService.ts` - Uses `/api/messages`, `/api/conversations`
- `src/lib/propertyService.ts` - Uses `/api/properties`, `/api/units`, `/api/tenants`
- `src/lib/paymentService.ts` - Uses `/api/payments`
- `src/lib/maintenanceService.ts` - Uses `/api/maintenance`

## 🔐 Authentication Flow

1. User enters email/password on login form
2. Frontend calls `POST /api/auth/login`
3. Server hashes password and queries MongoDB
4. Returns user object with id, email, role
5. Frontend stores user in localStorage

## 🗄️ Database Schema

### Collections

**users**
- _id, email, password (hashed), fullName, role, created_at

**properties**
- _id, owner_id, name, address, city, state, zip_code, description, image_url, amenities, created_at, updated_at

**units**
- _id, property_id, unit_number, unit_type, monthly_rent, security_deposit, status, floor_number, area_sqft, created_at, updated_at

**tenancies**
- _id, unit_id, tenant_id, start_date, end_date, is_active, created_at, updated_at

**conversations**
- _id, title, participants, created_at, updated_at

**messages**
- _id, conversation_id, sender_id, content, original_language, created_at

**rent_payments**
- _id, tenancy_id, amount, due_date, paid_date, status, payment_method, created_at

**maintenance_requests**
- _id, tenant_id, unit_id, category, title, description, priority, status, photo, created_at, updated_at

## ✨ Next Steps

1. **Start the server:**
   ```bash
   cd server && npm install && node index.js
   ```

2. **Run the frontend:**
   ```bash
   npm install
   npm run dev
   ```

3. **Test authentication:**
   - Use test users: `owner@test.com`, `manager@test.com`, `tenant@test.com` (all with password `password123`)
   - Or create new account via signup form

4. **Add properties and units** through the Properties page

5. **Manage tenants** through the Tenants page

## 🐛 Troubleshooting

### Server won't start
- Check MongoDB connection URI in `server/.env`
- Verify network access is enabled in MongoDB Atlas
- Check if port 4000 is already in use

### Frontend API calls failing
- Ensure server is running on `http://localhost:4000`
- Check browser console for CORS errors
- Verify endpoints match server routes

### Authentication not working
- Check email format
- Verify password is correct
- Look at server console for auth errors

## 📝 Notes

- All passwords are hashed using bcryptjs
- User data is stored in localStorage on login
- API calls use standard REST conventions (GET, POST, PATCH, DELETE)
- Mock data provides fallback when API is unavailable

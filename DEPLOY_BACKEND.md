# Backend Deployment Instructions

## 1. Create PostgreSQL Database

**Recommended: Neon (Free)**
- Go to https://neon.tech
- Sign up / log in
- Create new project: `church-cms-db`
- Copy **Pooled connection string**:
  ```
  postgresql://user:password@host/dbname?sslmode=require
  ```

## 2. Run Database Schema

In Neon Console → SQL Editor, paste and run:

```sql
-- Copy entire contents of server/src/database/schema.sql
-- Paste and execute
```

**Important:** The schema includes a default admin user with a default password hash. You MUST set a real password:

```sql
-- Generate bcrypt hash (run in Node or use online bcrypt generator)
-- OR update directly with a known hash:

-- First, generate a hash:
-- node -e "console.log(require('bcryptjs').hashSync('YourSecurePassword123!', 12))"

-- Then update admin password:
UPDATE users
SET password_hash = '$2b$12$YourGeneratedHashHere'
WHERE email = 'admin@redemptionpresby.org';
```

## 3. Deploy Backend to Render

1. Go to https://render.com → Dashboard → **New → Web Service**
2. Connect GitHub repo: `Phine-johnson/redemption-church-management-system`
3. Configuration:
   - **Name**: `church-cms-backend`
   - **Root Directory**: `server`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. **Environment Variables** → Add:
   ```
   DATABASE_URL = postgresql://user:pass@host/dbname?sslmode=require
   JWT_SECRET = your-super-secure-jwt-secret-key-at-least-256-bits
   NODE_ENV = production
   CORS_ORIGIN = https://your-frontend-url.vercel.app
   QR_SECRET = another-secure-secret-for-qr-codes
   ```
5. Click **"Create Web Service"**
6. Wait 5-10 minutes for deployment

Render will give you: `https://church-cms-backend.onrender.com`

## 4. Verify Backend Health

Test endpoint:
```
GET https://church-cms-backend.onrender.com/api/health
```

Expected: `{"status":"ok","service":"church-cms-server"}`

## 5. Update Frontend Proxy Configuration

Edit `vercel.json` in the project root to proxy API calls to your Render backend:

```json
{
  "buildCommand": "cd client && npm run build",
  "outputDirectory": "client/dist",
  "installCommand": "npm install",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://church-cms-backend.onrender.com/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Commit and push:
```bash
git add vercel.json
git commit -m "Point API to Render backend"
git push
```

Vercel will auto-redeploy the frontend.

## 6. Login Credentials (after deployment)

- **Email**: `admin@redemptionpresby.org`
- **Password**: `presby@200` (change immediately in Settings → Change Password)

**Additional test accounts** (after deploying):
- `audiovisual@redemptionpresby.org` / `presby@200` (AudioVisual role)
- `accountant@redemptionpresby.org` / `presby@200` (Accountant role)
- `clerk@redemptionpresby.org` / `presby@200` (Clerk role)
- `member@redemptionpresby.org` / (no password) (Member role)

## 7. Security Checklist

- [ ] Change default admin password on first login
- [ ] Update `JWT_SECRET` to a strong random value
- [ ] Update `QR_SECRET` for QR code signing
- [ ] Set `CORS_ORIGIN` to your specific Vercel domain
- [ ] Enable audit logging (already implemented)
- [ ] Configure backup strategy for PostgreSQL (Neon provides automated backups)

---

## Architecture Overview

```
Frontend (Vercel) → Rewrites → Backend (Render) → PostgreSQL (Neon)

Routing:
- /api/* → Render backend
- /* → frontend SPA (index.html)

Modules implemented:
✓ Authentication (JWT + refresh tokens)
✓ User management (CRUD, roles)
✓ Members (profiles, families, documents, custom fields)
✓ Attendance (QR check-in, services, history)
✓ Finance (donations, pledges, expenses, campaigns)
✓ Bulk SMS (templates, campaigns, delivery tracking)
✓ Equipment/Inventory (tracking, maintenance logs)
✓ Cluster Follow-up (small groups, visit scheduling)
✓ Prayer requests (submission, response tracking)
✓ Announcements (publish, target by role)
✓ Reports (dashboard, analytics, CSV export)
✓ Bible integration (API proxy, devotionals)
```

All data flows through the backend API. Local dev falls back to SQLite; production uses PostgreSQL.

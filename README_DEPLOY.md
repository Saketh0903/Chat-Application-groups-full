Deployment checklist

1. Build client
   - cd client
   - npm install
   - npm run build

2. Configure server environment variables
   - Create a .env file in server/ with:
     PORT=5000
     MONGO_URI=your_mongo_uri
     JWT_SECRET=your_jwt_secret
     CLIENT_URL=https://your-domain.com
     NODE_ENV=production

3. Start server (from server/)
   - npm install
   - npm start

Notes:
- server will serve static files from ../client/dist when NODE_ENV=production.
- Ensure Cloudinary credentials (if used) and other secret env vars are set.

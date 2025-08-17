Vercel deployment notes

If you see a "not found" error when deploying this repository to Vercel, it's usually because Vercel picked the repository root (which has no `package.json`) instead of the `client` folder.

Quick steps to deploy the client on Vercel

1. In Vercel dashboard -> Import Project -> Select this Git repository.
2. Set the "Root Directory" (or "Project Directory") to `client`.
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Add Environment Variables (if your frontend calls the API):
   - `VITE_API_URL` = https://<your-api-url>
   If your client and server are served from the same origin, you can leave it unset and use relative API paths.
6. Deploy.

Notes about the server (API)

- This repository contains a separate `server` app (Express). Vercel is fine for static/frontend apps and serverless functions, but this repo's server is a long-running Express/socket.io app and is better deployed to a server host (Render, Railway, DigitalOcean App Platform, Heroku, etc.).
- On whichever host you deploy the server, set the required env vars (`MONGODB_URI`, `JWT_SECRET`, Cloudinary keys, and optionally `CLIENT_URL` or `CLIENT_URLS`).
- After the server is deployed, set `VITE_API_URL` in the Vercel project to the server's public URL.

Security reminder

- Do not commit `.env` with secrets. If your `.env` is in the repository, remove it and rotate any exposed secrets.

Common fixes if you still see "not found"

- Make sure the Import settings in Vercel use `client` as the project root.
- Ensure `client/dist` is produced by the build command. Locally, run from the `client` folder: `npm run build` and confirm `dist/index.html` exists.
- If you want to host both client and server on the same host, deploy the server to a host that supports Node (not Vercel static) and configure the server to serve `client/dist` (the server already does this when `NODE_ENV=production`).

If you'd like, I can:
- Add a root `vercel.json` to configure monorepo routing (advanced).
- Create a tiny CI script to build the client and upload artifacts to a chosen server.
- Help deploy the server to Render/Railway and wire `VITE_API_URL`.

Tell me which option you want next.

# 90 Day Planner

This project now works both locally with Node.js and online on Vercel.

## Features

- Restricted login by approved phone number
- Server-side login validation
- Login history saved locally in `login-log.json`
- Vercel-compatible API routes in `api/`
- WhatsApp notification hook for new logins
- Manual resend of saved login history to WhatsApp
- 90 day planner export to a Word-compatible `.doc` file

## Run locally

1. Copy `.env.example` values into your local environment if needed.
2. Start the server:

```bash
npm start
```

3. Open `http://localhost:3000`

## Environment variables

- `PORT`: server port
- `HOST`: bind host
- `WHATSAPP_TO`: your admin WhatsApp number, default is `212696640278`
- `WHATSAPP_PHONE_NUMBER_ID`: Meta WhatsApp Business phone number id
- `WHATSAPP_ACCESS_TOKEN`: Meta WhatsApp Business permanent access token
- `UPSTASH_REDIS_REST_URL`: optional persistent storage for Vercel
- `UPSTASH_REDIS_REST_TOKEN`: optional persistent storage token for Vercel
- `LOGIN_LOG_STORAGE_KEY`: optional Redis key name, default is `login-log`

## WhatsApp note

Automatic WhatsApp sending works only after you configure your Meta WhatsApp Business credentials on the server.

The server sends a plain text message with only the user name after a successful login.
You can also resend the full saved login history to your WhatsApp number.

For local development, the logs are stored in `login-log.json`.
For Vercel production, you should configure Upstash Redis using `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` so the logs stay persistent across deployments and function runs.

## API endpoints

- `POST /api/login`
- `GET /api/logins`
- `POST /api/logins/resend-whatsapp`

## Deploy online

You can deploy this on Vercel, Render, Railway, a VPS, or any Node.js hosting provider.

### Vercel deployment steps

1. Push the project to GitHub
2. Import it into Vercel
3. Add these environment variables in Vercel:
   `WHATSAPP_TO`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`
4. For persistent login logs on Vercel, also add:
   `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
5. Redeploy

### Other Node hosting

1. Upload the project files to your server
2. Set the environment variables
3. Run `npm start`
4. Keep the process alive with a process manager like PM2 if needed

## Important

The current login list is stored in `lib/backend.js`. That is much better than exposing it in browser JavaScript, but for a larger production app the next upgrade should be a real database or admin panel.

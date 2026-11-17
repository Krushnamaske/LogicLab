# LogicLab — Digital Logic Learning Workspace

LogicLab is an interactive learning workspace for Boolean simplification and digital-code conversion. The original workspace UI and calculation features are retained; an account landing page and MongoDB-backed authentication layer have been added in front of it.

## Features

- Karnaugh-map solver for 2–4 variables
- SOP and POS minimization
- Truth-table and K-map visualization
- Grouping walkthrough and minimized equation
- Separate Quine–McCluskey page with binary grouping, combination rounds, prime implicants, chart and final equation
- Number-system and digital-code converters
- Converter equation references and visualizations
- Landing page, registration, login and logout
- MongoDB Atlas account storage
- Passwords hashed server-side with Node.js `scrypt`
- HTTP-only session cookie; session records expire after seven days
- Same account can log in from another device using the same deployed website

## Requirements

- Node.js 18+
- MongoDB Atlas Free (M0) cluster or compatible MongoDB instance
- A Vercel account for deployment

## MongoDB Atlas setup

1. Create an Atlas Free (M0) cluster.
2. In **Database Access**, create a database user and password.
3. In **Network Access**, allow access from your deployment. For Vercel, Atlas commonly requires `0.0.0.0/0` because serverless function IPs are not fixed. Use a strong database password and restrict access further if you have a fixed egress solution.
4. Copy the Atlas connection string.
5. Replace the username/password placeholders. URL-encode special characters in the database password.
6. The application creates a `users` collection with a unique email index and a `sessions` collection with TTL expiry.

Do not enable paid Atlas backups or upgrade the cluster if you want to remain on the free tier. Monitor Atlas usage and plan limits.

## Run locally

1. Copy `.env.example` to `.env`.
2. Fill in `MONGODB_URI`, `MONGODB_DB` and set `NODE_ENV=development`.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the local server:

   ```bash
   npm start
   ```

5. Open `http://127.0.0.1:3000`.

The server requires a reachable MongoDB database for registration and login. If the database URI is missing or Atlas is unreachable, the authentication API returns an error; the calculator workspace code itself remains client-side.

## Deploy to Vercel

This project includes Vercel Node.js functions under `api/auth/`. The same-origin API is used by the frontend.

1. Push the contents of this project folder to the root of your GitHub repository (not the enclosing ZIP folder).
2. In Vercel, **Add New → Project**, import the GitHub repository.
3. Set the project root to the folder containing `index.html`, `package.json`, `vercel.json` and `api/` (normally `./`).
4. Framework preset: **Other**.
5. No build command is required. Leave the output directory empty/default; do not set a static output directory that excludes the API functions.
6. Add these environment variables in Vercel → Project → Settings → Environment Variables:
   - `MONGODB_URI` = your Atlas connection string
   - `MONGODB_DB` = `logiclab`
   - `NODE_ENV` = `production`
7. Deploy. Redeploy after changing environment variables.
8. Open the deployed URL and register a test account. Then log out and log in again. Test the same account in a private/incognito window or a second device.

Vercel's Hobby plan has usage, function-duration and fair-use limits. MongoDB Atlas M0 is free within its published limits. Check current provider limits before public/production use.

## Authentication design

- Registration validates name, email and password on the server.
- Email addresses are normalized to lowercase and uniquely indexed.
- Passwords are never stored as plaintext. A random salt and Node.js `scrypt` hash are stored.
- Login verifies the password using a timing-safe comparison.
- A random session token is stored only as a SHA-256 hash in MongoDB. The browser receives the original token in an `HttpOnly`, `SameSite=Lax` cookie; production cookies also use `Secure`.
- Sessions expire after seven days and are removed by MongoDB TTL cleanup.
- Logout deletes the session and clears the cookie.

### Important security and production notes

This is a practical student-project authentication implementation, not a substitute for a professional security review. Before production use, add rate limiting, email verification, password reset, CSRF protections appropriate to your deployment, monitoring, backups, and abuse controls. Do not reuse the Atlas database password as a user password. Never commit `.env` or credentials to GitHub. Rotate any secret that was accidentally committed.

Existing browser-only demo accounts from earlier builds are not migrated. Users need to register again with this database-backed version.

## Project structure

```text
cp/
├── api/
│   └── auth/
│       ├── login.js
│       ├── logout.js
│       ├── me.js
│       └── register.js
├── lib/
│   └── auth.js
├── index.html
├── styles.css
├── app.js
├── auth.js
├── server.js
├── package.json
├── vercel.json
├── .env.example
└── start-windows.bat
```

## Troubleshooting

- **"Something went wrong" on registration/login:** Check `MONGODB_URI`, Atlas database user/password, Network Access allowlist, and Vercel function logs.
- **Authentication API says database not configured:** Ensure all environment variables are added to the correct Vercel environment and redeploy.
- **Login works on one device but not another:** Confirm both devices use the exact same deployed domain and that the same Atlas database is configured. Accounts created on localhost are in the configured database only if local `.env` points to the same Atlas cluster.
- **404 on `/api/auth/...`:** Confirm the `api/` directory is at the Vercel project root and that the project was deployed as a Vercel project, not only as a static upload.
- **Atlas connection timeout:** Check Atlas Network Access and database credentials.

## Privacy

Boolean calculations are performed in the browser. Authentication data is sent to the LogicLab server and stored in the configured MongoDB database. Do not enter personal or confidential information into example calculations.

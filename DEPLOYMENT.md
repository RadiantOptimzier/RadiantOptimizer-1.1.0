# 🚀 RadiantOptimizer Deployment Guide

## 🔒 CRITICAL SECURITY STEPS (DO THESE FIRST!)

### 1. Regenerate ALL Compromised Keys

Since your keys were in the original server.js file, they may have been compromised. **You MUST regenerate them before deploying:**

#### Stripe Keys:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. **Roll** (regenerate) your secret key
3. Update the new key in `.env`
4. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
5. Delete the old webhook endpoint
6. Create a new webhook endpoint with your production URL
7. Update `STRIPE_WEBHOOK_SECRET` in `.env`

#### Firebase Service Account:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Project Settings → Service Accounts
3. Click "Generate New Private Key"
4. Download the JSON file
5. Update ALL Firebase values in `.env` with the new credentials
6. **Delete the old service account** for security

#### Admin API Key:
Generate a new secure random key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Update `ADMIN_API_KEY` in `.env`

### 2. Install Dependencies

```bash
cd radiantoptimizer
npm install
```

This will install the `dotenv` package and all other dependencies.

### 3. Test Locally

```bash
# Make sure .env file exists with all your secrets
npm start

# Or for development with auto-reload:
npm run dev
```

Visit `http://localhost:8000` - you should see "RadiantOptimizer Backend API is running"

## 📦 Deployment Options

### Option 1: Heroku (Recommended for Beginners)

1. **Install Heroku CLI:**
   ```bash
   # Windows (download installer from heroku.com/cli)
   # Or use npm:
   npm install -g heroku
   ```

2. **Login to Heroku:**
   ```bash
   heroku login
   ```

3. **Create Heroku App:**
   ```bash
   heroku create radiantoptimizer-backend
   ```

4. **Set Environment Variables:**
   ```bash
   # DO NOT commit .env to git! Set vars in Heroku instead:
   heroku config:set STRIPE_SECRET_KEY=your_new_stripe_key
   heroku config:set STRIPE_WEBHOOK_SECRET=your_webhook_secret
   heroku config:set FIREBASE_PROJECT_ID=radiantoptimizer
   # ... set ALL environment variables from .env
   
   # Or use this helper to set all at once:
   heroku config:set $(cat .env | grep -v '^#' | xargs)
   ```

5. **Deploy:**
   ```bash
   git add .
   git commit -m "Secure backend ready for deployment"
   git push heroku main
   ```

6. **Update Stripe Webhook URL:**
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://radiantoptimizer-backend.herokuapp.com/webhook`
   - Select events: `checkout.session.completed`

### Option 2: Railway.app

1. **Sign up at [Railway.app](https://railway.app)**

2. **Create New Project:**
   - Connect your GitHub repository
   - Railway will auto-detect Node.js

3. **Add Environment Variables:**
   - Go to Variables tab
   - Add each variable from your `.env` file

4. **Deploy:**
   - Railway auto-deploys on git push
   - Get your URL from the Deployments tab

5. **Update Stripe Webhook:**
   - Use your Railway URL: `https://your-app.railway.app/webhook`

### Option 3: Render.com

1. **Sign up at [Render.com](https://render.com)**

2. **Create New Web Service:**
   - Connect repository
   - Choose "Node" environment
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Add Environment Variables:**
   - Go to Environment tab
   - Add all variables from `.env`

4. **Deploy**

### Option 4: DigitalOcean App Platform

1. **Sign up at [DigitalOcean](https://digitalocean.com)**

2. **Create App:**
   - Connect your GitHub repo
   - Choose Basic plan
   - Select region closest to your users

3. **Configure:**
   - Add environment variables
   - Set run command: `npm start`

4. **Deploy**

## 🔧 Environment Variables Checklist

Make sure ALL these are set in your deployment platform:

- [ ] `PORT` (usually auto-set)
- [ ] `NODE_ENV=production`
- [ ] `STRIPE_SECRET_KEY` (NEW regenerated key)
- [ ] `STRIPE_WEBHOOK_SECRET` (NEW webhook secret)
- [ ] `FIREBASE_TYPE`
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_PRIVATE_KEY_ID` (NEW)
- [ ] `FIREBASE_PRIVATE_KEY` (NEW - include quotes)
- [ ] `FIREBASE_CLIENT_EMAIL` (NEW)
- [ ] `FIREBASE_CLIENT_ID` (NEW)
- [ ] `FIREBASE_AUTH_URI`
- [ ] `FIREBASE_TOKEN_URI`
- [ ] `FIREBASE_AUTH_PROVIDER_CERT_URL`
- [ ] `FIREBASE_CLIENT_CERT_URL` (NEW)
- [ ] `ADMIN_API_KEY` (NEW regenerated)
- [ ] `CORS_ORIGIN` (your frontend URL)
- [ ] `APP_URL` (your frontend URL)

## 🔗 Update Frontend URLs

After deployment, update your frontend files to use the new backend URL:

### In `js/stripe-checkout.js`:
```javascript
const BACKEND_URL = 'https://your-backend-url.com';
```

### In `js/dashboard.js`:
```javascript
const BACKEND_URL = 'https://your-backend-url.com';
```

## ✅ Post-Deployment Checklist

- [ ] Backend is running (visit `/` endpoint)
- [ ] Stripe webhook is configured with production URL
- [ ] Test a payment flow end-to-end
- [ ] Check Heroku/Railway logs for errors
- [ ] Verify license key generation works
- [ ] Test admin endpoints with new API key
- [ ] Monitor first few real transactions
- [ ] Set up error monitoring (Sentry, etc.)

## 🛡️ Security Best Practices

### Never Commit:
- `.env` file
- `node_modules/`
- Any JSON files with credentials
- Private keys or certificates

### Always:
- Use environment variables
- Regenerate keys after any exposure
- Use HTTPS only
- Keep dependencies updated
- Monitor logs for suspicious activity
- Set up rate limiting (future improvement)

## 🐛 Troubleshooting

### "Webhook signature verification failed"
- Make sure you updated the webhook secret after regenerating
- Check that the endpoint URL matches exactly

### "Firebase initialization error"
- Verify all Firebase environment variables are set
- Check that `FIREBASE_PRIVATE_KEY` includes the quotes and `\n` characters

### "Stripe API error"
- Confirm you're using the new regenerated secret key
- Check that the key starts with `sk_live_` for production

### CORS errors
- Set `CORS_ORIGIN` to your exact frontend URL
- Make sure there's no trailing slash

## 📞 Support

If you encounter issues:
1. Check the server logs first
2. Verify all environment variables are set
3. Test with Stripe's test mode first
4. Check Stripe dashboard for webhook events

## 🎉 You're Ready!

Once all security steps are complete and deployment is successful, your RadiantOptimizer backend is ready for production!

Remember:
- **NEVER** commit `.env` to Git
- **ALWAYS** use environment variables for secrets
- **MONITOR** your logs regularly
- **UPDATE** dependencies periodically

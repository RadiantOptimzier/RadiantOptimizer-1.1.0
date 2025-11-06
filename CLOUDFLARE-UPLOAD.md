# 🚀 Upload to Cloudflare Pages - Simple Guide

## What to Upload

**Upload ONLY the frontend files** (not server.js or backend files):

### ✅ Files TO Upload:
```
radiantoptimizer/
├── index.html
├── dashboard.html
├── login.html
├── signup.html
├── terms.html
├── privacy.html
├── css/
│   ├── style.css
│   ├── dashboard.css
│   ├── auth.css
│   └── legal.css
├── js/
│   ├── main.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── signup-validation.js
│   └── stripe-checkout.js
└── images/ (if you have any)
```

### ❌ Files NOT to Upload:
```
❌ server.js (stays on Render)
❌ .env (contains secrets)
❌ package.json (for backend only)
❌ node_modules/ (backend dependencies)
❌ webhook-update.js (backend file)
```

## Method 1: Direct Upload (Easiest)

### Step 1: Create a Clean Folder

1. **Create a new folder** on your Desktop called `radiant-frontend`

2. **Copy ONLY these files** into it:
   - All `.html` files
   - The `css` folder
   - The `js` folder
   - Any `images` folder if you have one

### Step 2: Upload to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)

2. Click **Workers & Pages** in left sidebar

3. Click **Create application** → **Pages** → **Upload assets**

4. **Drag and drop** your `radiant-frontend` folder

5. Give it a name: `radiantoptimizer`

6. Click **Deploy site**

7. Wait for deployment (usually takes 30 seconds)

8. You'll get a URL like: `radiantoptimizer.pages.dev`

### Step 3: Done!

Your website is now live at your Cloudflare URL! 🎉

## Method 2: Using Git (If You Want Version Control)

### Step 1: Initialize Git

```bash
cd C:\Users\wicke\Desktop\radiantoptimizer

# Initialize git (if not already done)
git init

# Add all files (the .gitignore will protect your secrets)
git add .

# Commit
git commit -m "Initial commit - RadiantOptimizer frontend"
```

### Step 2: Create GitHub Repository

1. Go to [GitHub](https://github.com)
2. Click **New repository**
3. Name it: `radiantoptimizer`
4. Click **Create repository**

### Step 3: Push to GitHub

```bash
# Add remote
git remote add origin https://github.com/YOUR_USERNAME/radiantoptimizer.git

# Push
git push -u origin main
```

### Step 4: Connect to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)

2. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**

3. Select your GitHub repository: `radiantoptimizer`

4. Configure build:
   - **Build command:** Leave empty
   - **Build output directory:** `/`
   - **Root directory:** `/`

5. Click **Save and Deploy**

6. Cloudflare will auto-deploy whenever you push to GitHub!

## Verify Deployment

After deployment, visit your Cloudflare URL and check:

- [ ] Homepage loads correctly
- [ ] Can sign up / log in
- [ ] Dashboard shows after login
- [ ] Purchase button works (redirects to Stripe)
- [ ] Styles load properly
- [ ] No console errors

## Custom Domain (Optional)

To use your own domain:

1. In Cloudflare Pages → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `radiantoptimizer.com`)
4. Follow DNS setup instructions
5. Wait for SSL certificate (automatic)

## Troubleshooting

### "Backend not responding"
- Check your Render backend is running
- Verify the URL in `js/stripe-checkout.js` is correct

### "Firebase error"
- Make sure Firebase config is in your frontend files
- Check Firebase console for any issues

### "Can't find page"
- Make sure `index.html` is in the root of your upload
- Check all file paths are relative (no absolute paths)

### "Styles not loading"
- Check CSS file paths in HTML
- Make sure `css/` folder uploaded correctly
- Verify paths use forward slashes: `css/style.css`

## Quick Upload Checklist

Before uploading:

- [ ] Created clean frontend-only folder
- [ ] Included all `.html` files
- [ ] Included `css/` folder with all styles
- [ ] Included `js/` folder with all scripts
- [ ] Backend URL in JavaScript points to Render
- [ ] No `.env` or `server.js` in upload folder
- [ ] No `node_modules/` in upload folder

## Your Setup

After this guide:

- ✅ **Frontend:** `radiantoptimizer.pages.dev` (Cloudflare)
- ✅ **Backend:** `radiant-backend-xoxk.onrender.com` (Render)
- ✅ **Database:** Firebase (already configured)
- ✅ **Payments:** Stripe (connected to backend)

Everything is connected and ready to go! 🚀

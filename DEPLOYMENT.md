# Deployment Guide - Braun Hugo Theme on Cloudflare Pages

This document provides step-by-step instructions for deploying the Braun Hugo theme to Cloudflare Pages with automatic updates from GitHub.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Cloudflare Pages Setup](#cloudflare-pages-setup)
3. [Custom Domain Configuration](#custom-domain-configuration)
4. [Monitoring Deployments](#monitoring-deployments)
5. [Troubleshooting](#troubleshooting)
6. [Updating Your Site](#updating-your-site)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ **GitHub Account**: Repository at `github.com/unclebike/braun-hugo`
- ✅ **Cloudflare Account**: Free tier or paid (create at https://dash.cloudflare.com)
- ✅ **Repository Pushed**: All code pushed to the `main` branch
- ✅ **Build Verified Locally**: Run `hugo --minify` to confirm successful builds

### Current Repository Status

- **Repository URL**: `git@github.com:unclebike/braun-hugo.git`
- **Branch**: `main` (default deployment branch)
- **Last Commit**: All content and configuration changes pushed
- **Build Status**: ✅ Hugo builds 63 pages successfully

---

## Cloudflare Pages Setup

### Step 1: Log Into Cloudflare Dashboard

1. Visit https://dash.cloudflare.com
2. Sign in with your Cloudflare account (create one if needed)

### Step 2: Create a Cloudflare Pages Project

1. In the dashboard sidebar, navigate to **Workers & Pages**
2. Click the **Create Application** button
3. Select the **Pages** tab
4. Click **Connect to Git**

### Step 3: Connect Your GitHub Repository

1. You'll be prompted to authorize Cloudflare with GitHub
2. Click **Authorize Cloudflare** and follow GitHub's OAuth flow
3. Select your GitHub organization or account
4. Find and select the repository: `braun-hugo`
5. Click **Begin Setup**

### Step 4: Configure Build Settings

When prompted, enter the following settings:

**Project Name**: 
```
theme-unclebike-xyz
```

**Production branch**:
```
main
```

**Build command**:
```
npm install -g hugo && hugo --minify && npx pagefind --site public
```

**Build output directory**:
```
public
```

**Root directory** (if asked):
```
/ (leave blank for root)
```

### Step 5: Set Environment Variables

Click **Environment variables** and add the following:

| Variable | Value | Notes |
|----------|-------|-------|
| `HUGO_VERSION` | `0.121.0` | (Optional—Hugo is installed via npm) |
| `HUGO_ENV` | `production` | Required for minification |
| `NODE_ENV` | `production` | For optimal build performance |

**To add variables**:
1. Click **Add environment variables**
2. Select **Production** environment
3. Add each variable with its value
4. Click **Save**

### Step 6: Deploy

1. Review all settings one final time
2. Click **Save and Deploy**
3. Cloudflare will begin your first deployment
4. This typically takes 1-2 minutes

---

## Deployment Success Indicators

Once deployment completes, you should see:

✅ **Deployment Status**: "Success" badge in green  
✅ **Site URL**: A preview link like `theme-unclebike-xyz.pages.dev`  
✅ **Build Logs**: Clear build output with no errors  
✅ **Live Site**: Your Hugo site accessible at the Pages URL  

### Your Deployment URL

After successful deployment, your site will be available at:

```
https://theme-unclebike-xyz.pages.dev
```

You can share this link immediately—it's fully functional and live.

---

## Custom Domain Configuration (Optional)

If you want to use your own domain instead of `theme-unclebike-xyz.pages.dev`:

### Step 1: Access Project Settings

1. In Cloudflare Pages, navigate to your **theme-unclebike-xyz** project
2. Click **Settings**
3. Select **Domains** from the left sidebar

### Step 2: Add Custom Domain

1. Click **Add custom domain**
2. Enter your domain name (e.g., `theme.unclebike.xyz` or `braun.dev`)
3. Click **Activate domain**

### Step 3: Update DNS Records

Cloudflare will provide either:

**Option A: CNAME Record** (subdomain only):
```
Name: your-subdomain
Type: CNAME
Content: theme-unclebike-xyz.pages.dev
```

**Option B: A Record** (root domain):
```
Name: @ (root)
Type: A
Content: 192.0.2.1 (provided by Cloudflare)
```

### Step 4: Verify DNS

- Wait 5-15 minutes for DNS propagation
- Visit your custom domain
- HTTPS certificate is automatic—no configuration needed

---

## Monitoring Deployments

### Check Deployment Status

1. Go to your project in **Workers & Pages**
2. Click **Deployments** tab
3. View:
   - ✅ Current live deployment
   - 📊 Build logs
   - ⏱️ Build duration
   - 📝 Git commit details

### View Build Logs

Click on any deployment to see:
- Hugo build output
- Pagefind indexing logs
- Any warnings or errors
- Total files generated

### Set Up Deployment Notifications

1. Go to project **Settings** → **Notifications**
2. Add email notification for:
   - ✅ Deployment successful
   - ⚠️ Deployment failed

---

## Troubleshooting

### Deployment Failed - Build Error

**Common causes**:

| Error | Solution |
|-------|----------|
| `hugo: command not found` | Update build command to: `npm install -g hugo && hugo --minify` |
| `output directory not found` | Ensure build output directory is exactly: `public` |
| `node modules missing` | Add `npm install` before build command |

**Check build logs**:
1. Go to **Deployments** tab
2. Click the failed deployment
3. View the build log for specific error messages

### Site Shows 404 - Page Not Found

**Possible causes**:
- Build output directory is incorrect
- Files not properly generated by Hugo
- Cache not cleared

**Solution**:
1. Manually trigger a redeploy:
   - Go to **Deployments**
   - Find the latest failed build
   - Click **Retry deployment**
2. Or, push a new commit:
   ```bash
   git commit --allow-empty -m "Trigger redeploy"
   git push origin main
   ```

### Domain Not Working

**Check**:
1. DNS records are correct (validate at https://www.nslookup.io)
2. Wait 15-30 minutes for full DNS propagation
3. Try clearing your browser cache (Ctrl+F5 or Cmd+Shift+R)

### Build Takes Too Long

**Normal build time**: 30-60 seconds

**If slower**:
1. Check for large image files in `static/`
2. Remove unused dependencies from `package.json`
3. Clear Hugo cache: `rm -rf resources/_gen/`

---

## Updating Your Site

### Adding New Content

1. Create new markdown files in `content/posts/` or `content/pages/`
2. Commit and push:
   ```bash
   git add content/
   git commit -m "Add new post: [title]"
   git push origin main
   ```
3. Cloudflare automatically detects the push
4. New deployment starts within seconds
5. Site updates in 1-2 minutes

### Modifying Configuration

Changes to `hugo.toml` or `wrangler.toml`:

1. Edit the file locally
2. Test with: `hugo --minify`
3. Commit and push:
   ```bash
   git add hugo.toml
   git commit -m "Update: [description]"
   git push origin main
   ```
4. Cloudflare redeploys automatically

### Updating Theme

To update the Braun theme in `themes/braun-hugo/`:

1. Make changes locally
2. Test with: `hugo server -D`
3. Commit and push all changes
4. Cloudflare redeploys with new theme

---

## Performance Monitoring

### Check Site Performance

1. In Cloudflare Pages project, view **Analytics**
2. Monitor:
   - 📈 Requests per day
   - ⚡ Average response time
   - 🌍 Geographic distribution
   - 📱 Browser/device breakdown

### Optimize Images

Since this is a static site:
- Compress images before uploading
- Use WebP format where possible
- Cloudflare's image optimization (via Cloudflare Image)

### Enable Caching

By default, Cloudflare caches static assets. For aggressive caching:

1. Go to **Settings** in Cloudflare dashboard
2. Set **Browser Cache TTL**: 1 month
3. Enable **Caching Level**: Cache Everything

---

## Rollback to Previous Version

If a deployment has issues:

1. Go to **Deployments** tab
2. Find the previous successful deployment
3. Click the **three dots** menu
4. Select **Rollback to this deployment**
5. Cloudflare redeploys the old version immediately

---

## Important Notes

### Build Command Explanation

```bash
npm install -g hugo && hugo --minify && npx pagefind --site public
```

This command:
1. **`npm install -g hugo`** - Installs Hugo (Cloudflare environment)
2. **`hugo --minify`** - Builds the site with minified output
3. **`npx pagefind --site public`** - Generates search index

### Environment Variables

- **HUGO_ENV=production** - Enables minification and production features
- **NODE_ENV=production** - Optimizes Node.js runtime

Without these, your site may not minify correctly.

### DNS Propagation

After changing domains:
- Expect 5-15 minutes for global DNS propagation
- Some regions may take up to 48 hours
- Use https://www.whatsmydns.net to check propagation

---

## Support

### For Cloudflare Issues
- **Docs**: https://developers.cloudflare.com/pages/
- **Community**: https://community.cloudflare.com
- **Support**: https://support.cloudflare.com

### For Hugo Issues
- **Docs**: https://gohugo.io/documentation/
- **Community**: https://discourse.gohugo.io
- **GitHub**: https://github.com/gohugoio/hugo/issues

### For This Theme
- **Repository**: https://github.com/unclebike/braun-hugo
- **Issues**: Create a GitHub issue in the repository

---

## Quick Reference

### One-Time Setup (Cloudflare)
```
1. Cloudflare Dashboard
2. Workers & Pages → Create Application → Connect to Git
3. Select: unclebike/braun-hugo
4. Build command: npm install -g hugo && hugo --minify && npx pagefind --site public
5. Output directory: public
6. Add env vars: HUGO_ENV=production, NODE_ENV=production
7. Save and Deploy
```

### After Deployment
- Site lives at: `theme-unclebike-xyz.pages.dev` (or your custom domain)
- Auto-deploys on every GitHub push to `main`
- View status anytime: Cloudflare Pages dashboard

### Make Changes
```bash
# Make changes locally
nano content/posts/new-post.md

# Test
hugo server -D

# Push to deploy
git add .
git commit -m "description"
git push origin main

# Auto-deployed in 1-2 minutes
```

---

**Last Updated**: February 9, 2024  
**Build Status**: ✅ Production Ready  
**All 63 pages built successfully**

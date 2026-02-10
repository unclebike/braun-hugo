# Cloudflare Pages Deployment - Live Setup Instructions

## Step 1: Connect GitHub Repository to Cloudflare Pages

### 1.1 Log Into Cloudflare Dashboard
- Go to: https://dash.cloudflare.com
- Sign in with your Cloudflare account
- *If you don't have an account, create a free one*

### 1.2 Navigate to Pages
- In the left sidebar, click **Workers & Pages**
- Click the **Pages** tab
- Click **Create Application** button (top right)

### 1.3 Connect to Git
- Click **Connect to Git**
- Click **GitHub** (authorize if needed)
- Grant Cloudflare permission to access your GitHub repositories
- Search for and select: `unclebike/braun-hugo`
- Click **Begin setup**

---

## Step 2: Configure Build Settings

### 2.1 Project Details
**Project name**: `theme-unclebike-xyz`

### 2.2 Build Settings
Leave these fields as shown:

| Field | Value |
|-------|-------|
| Production branch | `main` |
| Build command | `npm install -g hugo && hugo --minify && npx pagefind --site public` |
| Build output directory | `public` |

### 2.3 Environment Variables
Click **Add environment variables** → **Production**

Add these variables (create each one):

```
HUGO_VERSION = 0.121.0
HUGO_ENV = production
NODE_ENV = production
```

For each variable:
1. Click **Add variable**
2. Enter Variable name (e.g., `HUGO_ENV`)
3. Enter Value (e.g., `production`)
4. Click **Add variable** button

### 2.4 Deploy
- Click **Save and Deploy**
- Cloudflare will begin building your site
- This takes 1-2 minutes
- Watch the build logs appear in real-time

---

## Step 3: After First Deployment Succeeds

Once you see the **✅ Deployment Success** message:

### 3.1 Your Pages URL
Your site is now live at: `https://theme-unclebike-xyz.pages.dev`

### 3.2 Add Custom Domain
1. In your Pages project, click **Settings**
2. Click **Domains** in the left sidebar
3. Click **Add custom domain**
4. Enter your domain: `theme.unclebike.xyz`
5. Click **Activate domain**

---

## Step 4: Configure DNS for Your Domain

Cloudflare will show you DNS records to add. Choose one:

### Option A: If `book.unclebike.xyz` is a SUBDOMAIN (recommended)

Add a CNAME record to your DNS provider:

```
Name/Host: theme.unclebike.xyz
Type: CNAME
Content/Value: theme-unclebike-xyz.pages.dev
TTL: 3600 (or auto)
```

**Where to add this**:
- If you use Cloudflare for your domain DNS: Add in Cloudflare dashboard → DNS records
- If you use another provider (GoDaddy, Namecheap, etc.): Log into that service and add the record there

### Option B: If `book.unclebike.xyz` is a ROOT DOMAIN

Cloudflare will provide A records. Follow Cloudflare's instructions in the Pages domain setup.

---

## Step 5: Verify Domain Setup

### 5.1 Wait for DNS Propagation
- This typically takes 5-15 minutes
- Check progress here: https://www.whatsmydns.net
- Enter: `theme.unclebike.xyz`
- Wait for all nameservers to show the CNAME target

### 5.2 Test Your Domain
- Visit: `https://theme.unclebike.xyz` in your browser
- You should see your Uncle Bike site
- HTTPS certificate is automatic ✅

---

## Step 6: (Optional) Set as Default Domain

If you want `book.unclebike.xyz` as your primary domain:

1. In Pages project **Settings** → **Domains**
2. Click the **three dots** next to `book.unclebike.xyz`
3. Click **Set as primary domain**

Now visitors to `theme-unclebike-xyz.pages.dev` will redirect to `theme.unclebike.xyz`

---

## Automatic Updates

Every time you push to GitHub main branch:

```bash
git add .
git commit -m "Update content"
git push origin main
```

Cloudflare automatically:
1. ✅ Detects the push
2. ✅ Runs your build command
3. ✅ Deploys new version
4. ✅ Updates `book.unclebike.xyz` in 1-2 minutes

No manual deployment needed!

---

## Verify Everything Works

After domain setup completes, check:

✅ https://theme.unclebike.xyz loads your site
✅ HTTPS works (green lock icon)
✅ All pages load correctly
✅ Navigation works
✅ Blog posts visible
✅ Images load

---

## Troubleshooting

### Domain shows "Not Found"
- Wait 15-30 minutes for DNS propagation
- Check DNS record is correct (use whatsmydns.net)
- Clear browser cache (Ctrl+F5 or Cmd+Shift+R)

### Build Failed
- Go to Pages project → **Deployments**
- Click the failed deployment
- Check build logs for errors
- Common fix: Check that wrangler.toml has correct settings

### SSL Certificate Not Working
- Cloudflare automatically provisions SSL
- May take 5-10 minutes after domain is added
- Try again in 10 minutes if not showing

---

## Your Configuration

| Setting | Value |
|---------|-------|
| Repository | unclebike/braun-hugo |
| GitHub Branch | main |
| Pages Project Name | theme-unclebike-xyz |
| Pages URL | theme-unclebike-xyz.pages.dev |
| Custom Domain | theme.unclebike.xyz |
| Build Command | npm install -g hugo && hugo --minify && npx pagefind --site public |
| Output Directory | public |
| Environment | Hugo + Static Site |
| SSL | Automatic (Cloudflare) |

---

## Need Help?

- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages/
- **Cloudflare Support**: https://support.cloudflare.com
- **Check Build Logs**: Pages project → Deployments → Click any build → View logs

Your site is ready to deploy! 🚀

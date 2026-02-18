# Braun Hugo Theme

A feature-rich Hugo theme ported from the Braun Ghost theme, designed for portfolios, blogs, and content creators.

## Features

- **Responsive Design**: Mobile-first, fully responsive layout
- **8 Color Schemes**: Default, Onyx, Rust, Fossil, Mint, Ember, Ice, Maelstrom
- **5 Hero Layouts**: Rectangle image top, Circle image top, Image right, Image left, Wide image top
- **Multiple Blog Layouts**: Card, Expanded, Right thumbnail, Text-only, Minimal
- **Pagefind Search**: Fast, static search functionality
- **PhotoSwipe Gallery**: Lightbox for images
- **Multi-language Support**: EN, DE, ES, FR, NL, ZH
- **Dark Mode**: Automatic dark/light mode switching
- **GOATkit Integration**: Booking widget support
- **Cloudflare Pages Ready**: Deployment configuration included

## Installation

```bash
cd your-hugo-site
git clone https://github.com/yourusername/braun-hugo.git themes/braun-hugo
```

Add to your `hugo.toml`:

```toml
theme = "braun-hugo"
```

## Configuration

Copy the example config and customize:

```toml
baseURL = "https://yourdomain.com"
languageCode = "en-us"
title = "Your Site Title"
theme = "braun-hugo"

[params]
  # Color scheme
  color_combinations = "Default"  # Default, Onyx, Rust, Fossil, Mint, Ember, Ice, Maelstrom
  
  # Appearance
  appearance = "system"  # light, dark, system, user
  
  # Site info
  tagline_text = "Your tagline here"
  show_navigation_icons = true
  
  # Homepage
  hero_layout = "Rectangle image top"
  blog_article_layout = "Card"
  blog_image_orientation = "Landscape"
  
  # Post settings
  show_author = false
  show_social_share = false
  show_subscription_box = false
```

## Content Structure

```
content/
├── _index.md                 # Homepage
├── posts/                    # Blog posts
│   └── _index.md
├── pages/                    # Static pages
│   └── about.md
├── books/                    # Books section
│   └── _index.md
├── gallery/                  # Gallery section
│   └── _index.md
└── works/                    # Portfolio/Works section
    └── _index.md
```

## Migration from Ghost

1. Export your Ghost content (JSON)
2. Run the migration script:
   ```bash
   node scripts/migrate-content.js --input ghost-export.json
   ```
3. Copy images to `static/images/`
4. Build and deploy

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Deployment

### Cloudflare Pages

1. Connect your repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `public`

### Manual

```bash
hugo --minify
npx pagefind --site public
# Deploy public/ directory
```

## Credits

Original Ghost theme by [Themex Studio](https://themex.studio)
Ported to Hugo with love.

## License

MIT

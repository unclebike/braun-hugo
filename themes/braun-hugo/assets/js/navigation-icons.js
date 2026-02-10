const navigationIcons = {
    // Default icons using object literal notation
    home: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    
    // Default fallback icon
    default: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M9 18l6-6-6-6"></path></svg>`
};

class NavigationIconManager {
    constructor() {
        this.icons = navigationIcons;
    }

    // Add or update an icon for a specific navigation slug
    setIcon(slug, svgContent) {
        if (!slug || typeof svgContent !== 'string') {
            console.warn('Invalid icon definition:', { slug, svgContent });
            return;
        }
        this.icons[slug.toLowerCase()] = svgContent;
    }

    // Get icon for a specific navigation slug
    getIcon(slug) {
        return this.icons[slug.toLowerCase()] || this.icons.default;
    }

    // Initialize icons in navigation
    initializeNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            const slug = item.className
                .split(' ')
                .find(cls => cls.startsWith('nav-'))
                ?.replace('nav-', '');
                
            if (slug) {
                const iconContainer = item.querySelector('.nav-icon');
                if (iconContainer) {
                    iconContainer.innerHTML = this.getIcon(slug);
                }
            }
        });
    }

    // Add multiple icons at once
    setIcons(iconMap) {
        Object.entries(iconMap).forEach(([slug, svg]) => {
            this.setIcon(slug, svg);
        });
    }

    // Remove an icon (reverts to default)
    removeIcon(slug) {
        delete this.icons[slug.toLowerCase()];
    }

    // Validate SVG content
    validateSvg(svg) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, 'image/svg+xml');
        return !doc.querySelector('parsererror');
    }

    // Set icon with validation
    setIconSafe(slug, svgContent) {
        if (this.validateSvg(svgContent)) {
            this.setIcon(slug, svgContent);
            return true;
        }
        console.error('Invalid SVG content for slug:', slug);
        return false;
    }
}

// Create global instance
window.navIcons = new NavigationIconManager();

// Initialize after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    window.navIcons.initializeNavigation();
}); 
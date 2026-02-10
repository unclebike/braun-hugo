var html = document.documentElement;
var body = document.body;
var timeout;
var st = 0;

// Initialize functions
categoryNav();
portalButton();

// Combine all DOM-ready initialization functions
function initializeDOMFeatures() {
    const hasNextPage = document.querySelector('link[rel=next]') !== null;
    
    // Remove pagination elements if no next page exists
    if (!hasNextPage) {
        document.querySelector('.load-more')?.remove();
        document.querySelector('.gh-loadmore')?.remove();
    } else {
        // Initialize pagination only for non-index pages with feed
        const isMasonry = document.querySelector('.masonry-wrapper') !== null;
        const hasFeed = document.querySelector('.gh-feed') !== null;
        const isIndexPage = document.body.classList.contains('home-template');
        
        if (hasFeed && !isIndexPage && !window.paginationInitialized) {
            pagination(true, null, isMasonry);
            window.paginationInitialized = true;
        }
    }

    setupFootnotes();
    setMasonryAnimationDelay();
    initMasonryLayout();
}

// Call functions when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDOMFeatures);
} else {
    initializeDOMFeatures();
}

// First, define the NavigationIconManager class and its dependencies
const navigationIcons = {
    // Existing icons
    home: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    blog: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
    work: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    author: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,

    // Additional icons
    now: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>`,
    course: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
    faq: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    about: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    contact: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><circle cx="12" cy="12" r="4"></circle><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path></svg>`,
    books: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
    bookmarks: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`,
    podcasts: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
    newsletters: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>`,
    tools: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`,
    gallery: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-grid"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,

    // Social icons
    instagram: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`,
    twitter: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>`,
    linkedin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>`,
    facebook: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>`,
    github: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>`,
    shop: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`,
    youtube: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>`,

    // Home icon aliases
    homepage: function() { return this.home; },
    'main-page': function() { return this.home; },
    start: function() { return this.home; },
    'home-page': function() { return this.home; },
    dashboard: function() { return this.home; },

    // Now icon aliases
    current: function() { return this.now; },
    'now-page': function() { return this.now; },
    updates: function() { return this.now; },
    'whats-new': function() { return this.now; },
    status: function() { return this.now; },

    // Course icon aliases
    courses: function() { return this.course; },
    learning: function() { return this.course; },
    tutorials: function() { return this.course; },
    lessons: function() { return this.course; },
    education: function() { return this.course; },
    'online-courses': function() { return this.course; },

    // About icon aliases
    'about-me': function() { return this.about; },
    biography: function() { return this.about; },
    info: function() { return this.about; },
    introduction: function() { return this.about; },
    'about-us': function() { return this.about; },

    // FAQ icon aliases
    faqs: function() { return this.faq; },
    help: function() { return this.faq; },
    questions: function() { return this.faq; },
    'help-center': function() { return this.faq; },
    support: function() { return this.faq; },

    // Bookmarks icon aliases
    favorites: function() { return this.bookmarks; },
    saved: function() { return this.bookmarks; },
    'reading-list': function() { return this.bookmarks; },
    'saved-items': function() { return this.bookmarks; },
    collections: function() { return this.bookmarks; },

    // Podcasts icon aliases
    audio: function() { return this.podcasts; },
    episodes: function() { return this.podcasts; },
    shows: function() { return this.podcasts; },
    'podcast-episodes': function() { return this.podcasts; },
    broadcasts: function() { return this.podcasts; },

    // Newsletters icon aliases
    digest: function() { return this.newsletters; },
    updates: function() { return this.newsletters; },
    'email-updates': function() { return this.newsletters; },
    subscription: function() { return this.newsletters; },
    'mailing-list': function() { return this.newsletters; },

    // Gallery icon aliases
    photos: function() { return this.gallery; },
    images: function() { return this.gallery; },
    portfolio: function() { return this.gallery; },
    'photo-gallery': function() { return this.gallery; },
    'image-gallery': function() { return this.gallery; },
    showcase: function() { return this.gallery; },
    albums: function() { return this.gallery; },

    // Blog icon aliases
    posts: function() { return this.blog; },
    articles: function() { return this.blog; },
    writing: function() { return this.blog; },
    journal: function() { return this.blog; },
    'latest-posts': function() { return this.blog; },
    'my-blog': function() { return this.blog; },
    diary: function() { return this.blog; },
    thoughts: function() { return this.blog; },
    notes: function() { return this.blog; },
    'writing-archive': function() { return this.blog; },
     
    profile: function() { return this.author; },
    bio: function() { return this.author; },
     
    // Books icon aliases
    library: function() { return this.books; },
    reading: function() { return this.books; },
    'my-library': function() { return this.books; },
    'reading-list': function() { return this.books; },
    bookshelf: function() { return this.books; },
    'book-notes': function() { return this.books; },
    'book-reviews': function() { return this.books; },
    'recommended-books': function() { return this.books; },
    literature: function() { return this.books; },
    publications: function() { return this.books; },
     
    // Work icon aliases
    portfolio: function() { return this.work; },
    projects: function() { return this.work; },
    'my-work': function() { return this.work; },
    'case-studies': function() { return this.work; },
    experience: function() { return this.work; },
    'my-projects': function() { return this.work; },
    showcase: function() { return this.work; },
    achievements: function() { return this.work; },
    career: function() { return this.work; },
    'work-history': function() { return this.work; },
     
    social: function() { return this.contact; },
    connect: function() { return this.contact; },
     
    // Tools icon aliases
    resources: function() { return this.tools; },
    utilities: function() { return this.tools; },
    'my-tools': function() { return this.tools; },
    software: function() { return this.tools; },
    applications: function() { return this.tools; },
    'tool-kit': function() { return this.tools; },
    gear: function() { return this.tools; },
    equipment: function() { return this.tools; },
    'useful-tools': function() { return this.tools; },
    'resource-library': function() { return this.tools; },

    // Twitter icon aliases
    'x': function() { return this.twitter; },

    // Default fallback icon
    default: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-hash"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>`
};

class NavigationManager {
    constructor() {
        this.icons = navigationIcons;
        this.HEADER_PREFIX = "#";
        this.initialized = false;
        this.originalItems = null;
        this.pendingIcons = new Map(); // Store icons that are set before first initialization
        
        window.navIcons = {
            setIcon: (slug, svgContent) => {
                if (!slug || typeof svgContent !== 'string') {
                    console.warn('Invalid icon definition:', { slug, svgContent });
                    return;
                }
                
                // If not yet initialized, store for later
                if (!this.initialized) {
                    this.pendingIcons.set(slug.toLowerCase(), svgContent);
                    return;
                }
                
                // If already initialized, update and re-render
                this.icons[slug.toLowerCase()] = svgContent;
                this.updateIcons();
            },
            initializeNavigation: () => {
                this.initialize(true);
            },
            getIcon: (slug) => this.getIcon(slug)
        };
    }

    initialize(force = false) {
        if (this.initialized && !force) return;
        
        const headMenu = document.querySelector(".head-menu");
        if (!headMenu) return;

        // Apply any pending icons first
        if (this.pendingIcons.size > 0) {
            this.pendingIcons.forEach((svg, slug) => {
                this.icons[slug] = svg;
            });
            this.pendingIcons.clear();
        }

        // Store original items on first initialization
        if (!this.originalItems) {
            this.originalItems = Array.from(document.querySelectorAll(".head-menu .nav li"));
        }
        
        // Process and render
        const groups = this.processMenuItems(this.originalItems);
        this.renderGroups(headMenu, groups);
        
        this.initialized = true;
        headMenu.classList.add('initialized');
    }

    updateIcons() {
        const headMenu = document.querySelector(".head-menu");
        if (!headMenu) return;

        const groups = this.processMenuItems(this.originalItems);
        this.renderGroups(headMenu, groups);
    }

    processMenuItems(items) {
        return items.reduce((acc, item) => {
            const text = item.textContent.trim();
            const currentGroup = acc[acc.length - 1];
            
            if (text.startsWith(this.HEADER_PREFIX)) {
                acc.push({
                    header: text.slice(1),
                    items: []
                });
            } else {
                const link = item.querySelector("a");
                const slug = this.getNavSlug(item);
                
                if (currentGroup) {
                    currentGroup.items.push({
                        text,
                        link: link.href,
                        classNames: item.className,
                        icon: slug ? this.getIcon(slug) : '',
                    });
                }
            }
            return acc;
        }, [{ header: null, items: [] }]);
    }

    getNavSlug(element) {
        return Array.from(element.classList)
            .find(cls => cls.startsWith('nav-') && 
                        cls !== 'nav-item' && 
                        cls !== 'nav-current')
            ?.replace('nav-', '');
    }

    getIcon(slug) {
        if (!slug) return this.icons.default;
        
        const icon = this.icons[slug.toLowerCase()];
        
        if (typeof icon === 'function') {
            return icon.call(this.icons); // Call the alias function with icons object as context
        }
        
        return icon || this.icons.default;
    }

    renderGroups(headMenu, groups) {
        const fragment = document.createDocumentFragment();
        const container = document.createElement('div');
        container.className = "menu-item";

        groups.forEach(group => {
            if (group.items.length === 0) return;

            const div = document.createElement('div');
            div.className = "head-group";

            div.innerHTML = group.header 
                ? this.createGroupWithHeader(group)
                : this.createGroupWithoutHeader(group);

            container.appendChild(div);
        });

        fragment.appendChild(container);
        headMenu.innerHTML = '';
        headMenu.appendChild(fragment);
    }

    createGroupWithHeader(group) {
        return `
            <h6 class="head-group-header section-title">${group.header}</h6>
            ${this.createNavList(group.items)}
        `;
    }

    createGroupWithoutHeader(group) {
        return this.createNavList(group.items);
    }

    createNavList(items) {
        return `
            <ul class="nav">${
                items.map(item => `
                    <li class="nav-item ${item.classNames}">
                        <a href="${item.link}">
                            ${item.icon ? `<div class="nav-icon">${item.icon}</div>` : ''}
                            ${item.text}
                        </a>
                    </li>
                `).join('')
            }</ul>
        `;
    }
}

// Initialize as early as possible
window.navigationManager = new NavigationManager();
window.navigationManager.initialize();

// Backup initialization
document.addEventListener('DOMContentLoaded', () => {
    if (!window.navigationManager.initialized) {
        window.navigationManager.initialize();
    }
});

dropdown(false);

function portalButton() {
    'use strict';
    st = window.scrollY;

    if (st > 300) {
        body.classList.add('portal-visible');
    } else {
        body.classList.remove('portal-visible');
    }
}

function featured() {
    'use strict';
    var feed = document.querySelector('.featured-feed');
    if (!feed) return;

    tns({
        container: feed,
        controlsText: [
            '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M20.547 22.107L14.44 16l6.107-6.12L18.667 8l-8 8 8 8 1.88-1.893z"></path></svg>',
            '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M11.453 22.107L17.56 16l-6.107-6.12L13.333 8l8 8-8 8-1.88-1.893z"></path></svg>',
        ],
        gutter: 24,
        loop: false,
        nav: false,
        mouseDrag: true,
        responsive: {
            0: {
                items: 2,
            },
            768: {
                items: 2,
            },
            992: {
                items: 2,
            },
        },
    });
}

function darkPage() {
    var isDark = body.classList.contains('tag-hash-dark') ? 'dark' : 'light';
    html.classList.add(`${isDark}-page`);
}

function footerGroup() {
    const footerNav = document.querySelector(".footer-nav");
    if (!footerNav) return;
    
    const items = document.querySelectorAll(".footer-nav .nav li");

    const groups = [];
    let index = null;
    items.forEach(item => {
        const text = item.textContent.trim();
        const PREFIXFOOTERHEADER = "#";
        if (text.includes(PREFIXFOOTERHEADER)) {
            index = index === null ? 0 : ++index;
            groups[index] = { header: "", items: [] };
            groups[index].header = text.slice(PREFIXFOOTERHEADER.length);
        } else {
            groups[index].items.push({ text, link: item.childNodes[0].href });
        }
    })
    document.querySelector(".footer-nav ul.nav").remove();
    groups.forEach((group) => {
        const div = document.createElement('div');
        const h6 = document.createElement('h6');
        h6.classList.add("footer-group-header", "section-title");
        h6.innerHTML = group.header;
        const ul = document.createElement("ul");
        ul.classList.add("nav");
        group.items.forEach((item) => {
            const li = document.createElement("li");
            li.innerHTML = `<a href="${item.link}">${item.text}</a>`;
            ul.append(li);
        })
        div.append(h6, ul);
        footerNav.appendChild(div);
    });
}

function categoryNav() {
    var currentPageURL = window.location.pathname;

    // Get all <a> tags inside the .blog-navbar div
    var navbarLinks = document.querySelectorAll('.blog-navbar a');

    // Loop through each <a> tag
    navbarLinks.forEach(function(link) {
        // Check if the href attribute matches the current page URL
        if (link.getAttribute('href') === currentPageURL) {
            // Add the is-active class
            link.classList.add('is-active');
        }
    });
}

function initMasonryLayout() {
    const container = document.querySelector('.masonry-container');
    if (!container) return;
    
    // Store original order if not already stored
    if (!container.dataset.originalOrder) {
        const items = Array.from(document.querySelectorAll('.masonry-brick'));
        // Store just the IDs or data attributes that uniquely identify each brick
        container.dataset.originalOrder = items.map(item => 
            item.id || item.dataset.id || item.dataset.index || items.indexOf(item)
        ).join(',');
    }
    
    // Get current items and sort them according to original order
    const currentItems = Array.from(document.querySelectorAll('.masonry-brick'));
    const originalOrder = container.dataset.originalOrder.split(',');
    
    // Sort items based on original order
    const items = originalOrder.map(id => 
        currentItems.find(item => 
            (item.id || item.dataset.id || item.dataset.index || currentItems.indexOf(item)) == id
        )
    );
    
    if (!items.length) return;
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'masonry-wrapper gh-feed';
    
    // Create temporary wrapper to get computed style
    container.appendChild(wrapper);
    const computedStyle = getComputedStyle(wrapper);
    const columnCount = parseInt(computedStyle.getPropertyValue('--columns')) || 5;
    container.removeChild(wrapper);
    
    // Create columns
    const columns = Array.from({ length: columnCount }, () => {
        const column = document.createElement('div');
        column.className = 'masonry-column';
        wrapper.appendChild(column);
        return column;
    });
    
    // Distribute items to columns horizontally
    items.forEach((item, index) => {
        const columnIndex = index % columnCount;
        columns[columnIndex].appendChild(item);
    });
    
    // Replace existing content
    const existingWrapper = container.querySelector('.masonry-wrapper');
    if (existingWrapper) {
        container.replaceChild(wrapper, existingWrapper);
    } else {
        container.appendChild(wrapper);
    }
    
    // Handle image loading
    const images = document.querySelectorAll('.masonry-content img');
    let loadedImages = 0;
    const totalImages = images.length;
    
    const imageLoaded = () => {
        loadedImages++;
        if (loadedImages === totalImages) {
            wrapper.classList.remove('is-loading');
            initLightbox();
        }
    };

    images.forEach(img => {
        if (img.complete) {
            imageLoaded();
        } else {
            img.addEventListener('load', imageLoaded, { once: true });
            img.addEventListener('error', imageLoaded, { once: true });
        }
    });

    if (loadedImages === totalImages) {
        wrapper.classList.remove('is-loading');
        initLightbox();
    }
}

// Add resize handler with debounce
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(initMasonryLayout, 250);
});

function initLightbox() {
    const masonryImages = document.querySelectorAll('.masonry-content .zoom-image');
    if (!masonryImages.length) return;

    const pswpElement = document.querySelector('.pswp');
    if (!pswpElement) return;

    // Function to reset PhotoSwipe DOM to initial state
    function resetPhotoSwipe() {
        // Remove all added classes from root element
        pswpElement.className = 'pswp';
        
        // Reset container
        const container = pswpElement.querySelector('.pswp__container');
        container.removeAttribute('style');
        
        // Reset items
        const items = container.querySelectorAll('.pswp__item');
        items.forEach(item => {
            item.removeAttribute('style');
            item.innerHTML = ''; // Remove any zoom wraps and images
        });
        
        // Reset UI elements
        const uiElements = pswpElement.querySelectorAll('.pswp__button');
        uiElements.forEach(el => {
            el.classList.remove('pswp__element--disabled');
        });
        
        // Reset counter
        const counter = pswpElement.querySelector('.pswp__counter');
        if (counter) counter.textContent = '';
        
        // Reset UI visibility
        const ui = pswpElement.querySelector('.pswp__ui');
        ui.className = 'pswp__ui pswp__ui--hidden';
    }

    // Remove existing click listeners and create items array once
    const items = Array.from(masonryImages).map((image) => ({
        src: image.dataset.original || image.src,
        msrc: image.dataset.small,
        w: image.naturalWidth || 0,
        h: image.naturalHeight || 0,
        el: image
    }));

    function handleImageClick(e) {
        e.preventDefault();
        resetPhotoSwipe();
        
        // Find current index from pre-built items array
        const currentIndex = items.findIndex(item => item.el === e.target);
        if (currentIndex === -1) return;

        const options = {
            index: currentIndex,
            bgOpacity: 0.9,
            closeOnScroll: true,
            fullscreenEl: false,
            history: false,
            shareEl: false,
            zoomEl: true,
            getThumbBoundsFn: (index) => {
                const thumbnail = items[index].el;
                const rect = thumbnail.getBoundingClientRect();
                return {
                    x: rect.left,
                    y: rect.top + window.scrollY,
                    w: rect.width
                };
            }
        };

        const gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);
        
        gallery.listen('destroy', function() {
            gallery.close();
            resetPhotoSwipe();
        });

        gallery.init();
    }

    // Add click listeners
    masonryImages.forEach((img) => {
        img.removeEventListener('click', handleImageClick);
        img.addEventListener('click', handleImageClick);
    });
}

function setupFootnotes() {
    'use strict';
    const contentSelector = 'article.ghost-content';
    const contentElement = document.querySelector(contentSelector);
    if (!contentElement) return;

    let htmlContent = contentElement.innerHTML;
    const regexPattern = /\[\^(.*?)\]/g;
    
    // Check if there are any footnotes before proceeding
    const matches = htmlContent.match(regexPattern);
    if (!matches) return;

    const footnoteList = document.createElement('ol');
    footnoteList.classList.add('footnote-list');
    footnoteList.id = 'footnotes';
    
    const footnoteWrapper = document.createElement('div');
    footnoteWrapper.classList.add('kg-canvas', 'section-footnotes');
    
    let index = 1;
    
    htmlContent = htmlContent.replace(regexPattern, (match, p1) => {
        footnoteList.innerHTML = footnoteList.innerHTML + `<li id="footnote-${index}">${p1}</li>`;
        const returnValue = `<sup class="footnote"><a href="#footnote-${index}">[${index}]</a></sup>`;
        index++;
        return returnValue;
    });

    contentElement.innerHTML = htmlContent;
    
    footnoteWrapper.appendChild(footnoteList);
    contentElement.appendChild(footnoteWrapper);
}

function setMasonryAnimationDelay() {
    const bricks = document.querySelectorAll('.masonry-brick');
    bricks.forEach((brick, index) => {
        brick.style.animationDelay = `${index * 0.05}s`;
    });
}
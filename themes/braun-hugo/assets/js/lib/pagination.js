function pagination(isInfinite, done, isMasonry = false) {
    const feedElement = document.querySelector('.gh-feed');
    if (!feedElement) {
        // If no feed, remove pagination elements and return
        document.querySelector('.load-more')?.remove();
        document.querySelector('.gh-loadmore')?.remove();
        return;
    }

    let loading = false;
    const target = feedElement.nextElementSibling || feedElement.parentElement.nextElementSibling || document.querySelector('.gh-foot');
    const loadMoreElement = document.querySelector('.load-more');
    const buttonElement = document.querySelector('.gh-loadmore');

    // Check for next page and hide load-more elements if no pagination is needed
    // Also check if current page has fewer items than posts_per_page
    if (!document.querySelector('link[rel=next]') || feedElement.children.length === 0) {
        loadMoreElement?.remove();
        buttonElement?.remove();
        return;
    }

    const loadNextPage = async function () {
        const nextElement = document.querySelector('link[rel=next]');
        if (!nextElement) {
            loadMoreElement?.remove();
            buttonElement?.remove();
            return;
        }

        try {
            const res = await fetch(nextElement.href);
            const html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            let postElements;
            if (isMasonry) {
                postElements = doc.querySelectorAll('.masonry-brick');
            } else {
                postElements = doc.querySelectorAll('.gh-feed:not(.gh-featured):not(.gh-related) > *');
            }

            const elems = [];

            if (isMasonry) {
                const masonryContainer = document.querySelector('.masonry-container');
                
                // Get all current items and find the highest data-id
                const currentItems = Array.from(document.querySelectorAll('.masonry-brick'));
                const highestId = currentItems.reduce((max, item) => {
                    const currentId = parseInt(item.dataset.id) || 0;
                    return currentId > max ? currentId : max;
                }, 0);

                postElements.forEach(function (post, index) {
                    const clonedItem = document.importNode(post, true);
                    // Start numbering from the highest existing ID + 1
                    clonedItem.dataset.id = (highestId + index + 1).toString();
                    masonryContainer.appendChild(clonedItem);
                    elems.push(clonedItem);
                });

                // Update container's original order
                if (!masonryContainer.dataset.originalOrder) {
                    const allItems = Array.from(document.querySelectorAll('.masonry-brick'));
                    masonryContainer.dataset.originalOrder = allItems.map(item => 
                        item.dataset.id
                    ).join(',');
                } else {
                    // Append new IDs to existing order
                    const newIds = elems.map(item => item.dataset.id);
                    masonryContainer.dataset.originalOrder += ',' + newIds.join(',');
                }

                // Call initMasonryLayout immediately to start layout process
                initMasonryLayout();

                // Handle image loading separately
                const images = elems.map(elem => elem.querySelector('img'));
                let loadedImages = 0;
                const totalImages = images.length;

                const imageLoaded = () => {
                    loadedImages++;
                    if (loadedImages === totalImages) {
                        // Re-run masonry layout after all images are loaded
                        initMasonryLayout();
                    }
                };

                images.forEach(img => {
                    if (img && img.complete) {
                        imageLoaded();
                    } else if (img) {
                        img.addEventListener('load', imageLoaded, { once: true });
                        img.addEventListener('error', imageLoaded, { once: true });
                    }
                });
            } else {
                const fragment = document.createDocumentFragment();
                postElements.forEach(function (post) {
                    const clonedItem = document.importNode(post, true);
                    fragment.appendChild(clonedItem);
                    elems.push(clonedItem);
                });
                feedElement.appendChild(fragment);
            }

            if (done) {
                done(elems, loadNextWithCheck);
            }

            const resNextElement = doc.querySelector('link[rel=next]');
            if (resNextElement && resNextElement.href) {
                nextElement.href = resNextElement.href;
            } else {
                nextElement.remove();
                loadMoreElement?.remove();
                buttonElement?.remove();
            }
        } catch (e) {
            console.error('Pagination error:', e);
            nextElement.remove();
            loadMoreElement?.remove();
            buttonElement?.remove();
            throw e;
        }
    };

    const loadNextWithCheck = async function () {
        if (target.getBoundingClientRect().top <= window.innerHeight && document.querySelector('link[rel=next]')) {
            await loadNextPage();
        }
    }

    const callback = async function (entries) {
        if (loading) return;

        loading = true;

        if (entries[0].isIntersecting) {
            await loadNextPage();
        }

        loading = false;

        if (!document.querySelector('link[rel=next]')) {
            observer.disconnect();
            loadMoreElement?.remove();
        }
    };

    const observer = new IntersectionObserver(callback);

    if (isInfinite) {
        observer.observe(target);
    } else {
        buttonElement?.addEventListener('click', loadNextPage);
    }
}

// Export the pagination function
if (typeof window !== 'undefined') {
    window.pagination = pagination;
}
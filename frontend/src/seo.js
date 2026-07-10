const SITE_NAME = 'JCLcheck';
const SITE_URL = 'https://jclcheck.xyz';

function upsertMeta(
    attr,
    key,
    content
) {
    if (!content) {
        return;
    }

    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }

    el.setAttribute('content', content);
}

function upsertCanonical(href) {
    let el = document.head.querySelector('link[rel="canonical"]');
    if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', 'canonical');
        document.head.appendChild(el);
    }

    el.setAttribute('href', href);
}

/**
 * @param {{ title?: string, description?: string, path?: string, structuredData?: object }} opts
 */
export function applyPageSeo({
    title,
    description,
    path = '/',
    structuredData
} = {}) {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — Free JCL Validation Workbench`;
    const url = `${SITE_URL}${path}`;

    document.title = fullTitle;
    upsertMeta(
        'name',
        'description',
        description
    );

    upsertMeta(
        'property',
        'og:title',
        fullTitle
    );

    upsertMeta(
        'property',
        'og:description',
        description
    );

    upsertMeta(
        'property',
        'og:url',
        url
    );

    upsertMeta(
        'name',
        'twitter:title',
        fullTitle
    );

    upsertMeta(
        'name',
        'twitter:description',
        description
    );

    upsertCanonical(url);

    const existing = document.getElementById('route-structured-data');
    if (existing) {
        existing.remove();
    }

    if (structuredData) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'route-structured-data';
        script.textContent = JSON.stringify(structuredData);
        document.head.appendChild(script);
    }
}

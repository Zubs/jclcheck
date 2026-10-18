import { describe, test, expect, beforeEach } from 'vitest';
import { applyPageSeo } from '../src/seo.js';

function meta(attr, key) {
    return document.head.querySelector(`meta[${attr}="${key}"]`)?.getAttribute('content');
}

beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
});

describe('applyPageSeo', () => {
    test('sets the title, description, social tags and canonical address', () => {
        applyPageSeo({ title: 'About', description: 'Why JCLcheck exists.', path: '/about' });

        expect(document.title).toBe('About · JCLcheck');
        expect(meta('name', 'description')).toBe('Why JCLcheck exists.');
        expect(meta('property', 'og:title')).toBe('About · JCLcheck');
        expect(meta('property', 'og:description')).toBe('Why JCLcheck exists.');
        expect(meta('property', 'og:url')).toBe('https://jclcheck.xyz/about');
        expect(meta('name', 'twitter:title')).toBe('About · JCLcheck');
        expect(meta('name', 'twitter:description')).toBe('Why JCLcheck exists.');
        expect(document.head.querySelector('link[rel="canonical"]').getAttribute('href')).toBe('https://jclcheck.xyz/about');
    });

    test('uses the site title when no title is given', () => {
        applyPageSeo({});
        expect(document.title).toBe('JCLcheck — Free JCL Validation Workbench');
        expect(document.head.querySelector('link[rel="canonical"]').getAttribute('href')).toBe('https://jclcheck.xyz/');
    });

    test('updates existing tags instead of adding duplicates', () => {
        applyPageSeo({ title: 'One', description: 'First.', path: '/one' });
        applyPageSeo({ title: 'Two', description: 'Second.', path: '/two' });

        expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
        expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
        expect(meta('name', 'description')).toBe('Second.');
    });

    test('replaces structured data, and removes it when a page has none', () => {
        applyPageSeo({ title: 'FAQ', structuredData: { '@type': 'FAQPage' } });
        expect(document.querySelectorAll('#route-structured-data')).toHaveLength(1);

        applyPageSeo({ title: 'Plain' });
        expect(document.getElementById('route-structured-data')).toBeNull();
    });
});

import { describe, test, expect, vi } from 'vitest';
import router from '../src/router.js';

// The router scrolls to the top after each navigation; jsdom has no scrolling.
vi.stubGlobal('scrollTo', vi.fn());

function canonical() {
    return document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');
}

describe('router', () => {
    test('applies the landing page title and canonical address', async () => {
        await router.push('/');
        expect(document.title).toBe('Free JCL Check Online — Validate Job Control Language Without a Mainframe · JCLcheck');
        expect(canonical()).toBe('https://jclcheck.xyz/');
        expect(document.getElementById('route-structured-data')).not.toBeNull();
    });

    test('applies the about page title and canonical address', async () => {
        await router.push('/about');
        expect(document.title).toBe('About · JCLcheck');
        expect(canonical()).toBe('https://jclcheck.xyz/about');
        expect(document.getElementById('route-structured-data')).toBeNull();
    });

    test('applies the workbench title and canonical address', async () => {
        await router.push('/app');
        expect(document.title).toBe('JCL Check Online — Validation Workbench · JCLcheck');
        expect(canonical()).toBe('https://jclcheck.xyz/app');
    });

    test('every route has a title and description', () => {
        for (const route of router.getRoutes()) {
            expect(route.meta.title, route.path).toBeTruthy();
            expect(route.meta.description, route.path).toBeTruthy();
        }
    });
});

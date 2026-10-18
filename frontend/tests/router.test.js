import { describe, test, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import App from '../src/App.vue';
import router from '../src/router.js';
import { pageview } from '../src/analytics.js';

vi.mock('../src/analytics.js', () => ({ pageview: vi.fn(), track: vi.fn() }));
vi.mock('../src/api.js', () => ({ validateJcl: vi.fn(() => new Promise(() => {})) }));

// The router scrolls to the top after each navigation; jsdom has no scrolling.
vi.stubGlobal('scrollTo', vi.fn());

function canonical() {
    return document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');
}

beforeEach(() => {
    pageview.mockClear();
});

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

    test('the FAQ structured data includes the privacy answer', async () => {
        await router.push('/about');
        await router.push('/');
        const data = JSON.parse(document.getElementById('route-structured-data').textContent);
        const privacy = data.mainEntity.find(q => q.name === 'Does JCLcheck track me or keep my JCL?');
        expect(privacy.acceptedAnswer.text).toContain('never stored or counted');
        expect(privacy.acceptedAnswer.text).toContain('GoatCounter');
        expect(privacy.acceptedAnswer.text).toContain('Do Not Track or Global Privacy Control');
    });

    test('every route has a title and description', () => {
        for (const route of router.getRoutes()) {
            expect(route.meta.title, route.path).toBeTruthy();
            expect(route.meta.description, route.path).toBeTruthy();
        }
    });

    test('counts one page view for each page visited', async () => {
        await router.push('/');
        await router.push('/about');
        await router.push('/app');
        expect(pageview.mock.calls.map(([route]) => route.path)).toEqual(['/', '/about', '/app']);
    });

    test('shows the not-found page for an unknown address and counts it as not-found', async () => {
        const wrapper = mount(App, { global: { plugins: [router] } });
        await router.push('/no-such-page');
        await flushPromises();

        expect(wrapper.text()).toContain('Page not found');
        expect(wrapper.find('a[href="/"]').exists()).toBe(true);
        expect(document.title).toBe('Page not found · JCLcheck');
        expect(pageview).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'not-found', path: '/no-such-page' }));
        wrapper.unmount();
    });
});

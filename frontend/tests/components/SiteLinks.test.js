import { describe, test, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import Navbar from '../../src/components/marketing/Navbar.vue';
import Footer from '../../src/components/marketing/Footer.vue';
import Landing from '../../src/pages/Landing.vue';
import About from '../../src/pages/About.vue';
import { track } from '../../src/analytics.js';

vi.mock('../../src/analytics.js', () => ({ track: vi.fn(), pageview: vi.fn() }));

const Blank = { template: '<div/>' };

function makeRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: ['/', '/about', '/app'].map(path => ({ path, component: Blank }))
    });
}

async function mountWithRouter(component) {
    const router = makeRouter();
    router.push('/');
    await router.isReady();
    return mount(component, { global: { plugins: [router] } });
}

function link(wrapper, text) {
    const found = wrapper.findAll('a').find(a => a.text().includes(text));
    expect(found, `link "${text}"`).toBeTruthy();
    return found;
}

beforeEach(() => {
    track.mockClear();
});

describe('site links', () => {
    test.each([
        [Navbar, 'Launch Workbench', '/app', 'cta/launch', 'nav'],
        [Navbar, 'GitHub', 'https://github.com/Zubs/jclcheck', 'outbound', 'github-repo'],
        [Footer, 'Workbench', '/app', 'cta/launch', 'footer'],
        [Footer, 'GitHub', 'https://github.com/Zubs', 'outbound', 'github-profile'],
        [Footer, 'Zubair', 'https://zubs.github.io', 'outbound', 'portfolio'],
        [Landing, 'Launch the workbench', '/app', 'cta/launch', 'hero'],
        [Landing, 'Why I built this', '/about', 'cta/about', 'hero'],
        [Landing, 'Open the workbench', '/app', 'cta/launch', 'bottom'],
        [About, 'Portfolio', 'https://zubs.github.io', 'outbound', 'portfolio'],
        [About, 'GitHub — @Zubs', 'https://github.com/Zubs', 'outbound', 'github-profile'],
        [About, 'Open the workbench', '/app', 'cta/launch', 'about']
    ])('%o "%s" still points to %s and counts %s/%s', async (component, text, href, name, detail) => {
        const wrapper = await mountWithRouter(component);
        const a = link(wrapper, text);
        expect(a.attributes('href')).toBe(href);
        a.element.addEventListener('click', e => e.preventDefault(), { once: true });
        await a.trigger('click');
        expect(track).toHaveBeenCalledWith(name, detail);
        wrapper.unmount();
    });

    test('internal links still navigate when clicked', async () => {
        const router = makeRouter();
        router.push('/');
        await router.isReady();
        const wrapper = mount(Navbar, { global: { plugins: [router] } });
        await link(wrapper, 'Launch Workbench').trigger('click');
        await new Promise(resolve => setTimeout(resolve));
        expect(router.currentRoute.value.path).toBe('/app');
        wrapper.unmount();
    });
});

describe('FAQ', () => {
    test('opening question 2 counts faq/open/2, and closing it counts nothing', async () => {
        const wrapper = await mountWithRouter(Landing);
        const second = wrapper.findAll('details.faq-item')[1].element;

        second.open = true;
        second.dispatchEvent(new Event('toggle'));
        expect(track).toHaveBeenCalledWith('faq/open', 2);

        track.mockClear();
        second.open = false;
        second.dispatchEvent(new Event('toggle'));
        expect(track).not.toHaveBeenCalled();
        wrapper.unmount();
    });
});

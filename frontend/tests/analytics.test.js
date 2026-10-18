import { describe, test, expect, vi, beforeEach } from 'vitest';
import { initAnalytics, pageview, track, countedPath } from '../src/analytics.js';
import { EVENTS, CODE_PATTERN, isAllowed, sizeBucket } from '../src/analyticsEvents.js';

const URL = 'https://jclcheck.goatcounter.com/count';

// A fake browser: its own document, location and navigator, so the real page
// is never touched and the real script is never fetched.
function fakeEnv({ hostname = 'jclcheck.xyz', url = URL, doNotTrack, globalPrivacyControl } = {}) {
    const doc = document.implementation.createHTMLDocument('fake');
    const win = {};
    return {
        env: {
            url,
            location: { hostname },
            navigator: { doNotTrack, globalPrivacyControl },
            document: doc,
            win
        },
        doc,
        win,
        scripts: () => [...doc.querySelectorAll('script')],
        // Simulates count.js finishing loading, with a spy as goatcounter.count.
        load() {
            const count = vi.fn();
            win.goatcounter = { ...win.goatcounter, count };
            doc.querySelector('script').dispatchEvent(new Event('load'));
            return count;
        }
    };
}

beforeEach(() => {
    initAnalytics(fakeEnv({ hostname: 'localhost' }).env); // reset to off
});

describe('loading GoatCounter', () => {
    test('production with the address set adds exactly one script', () => {
        const fake = fakeEnv();
        expect(initAnalytics(fake.env)).toBe(true);
        const scripts = fake.scripts();
        expect(scripts).toHaveLength(1);
        expect(scripts[0].getAttribute('src')).toBe('https://gc.zgo.at/count.js');
        expect(scripts[0].dataset.goatcounter).toBe(URL);
        expect(scripts[0].async).toBe(true);
        expect(fake.win.goatcounter).toEqual({ no_onload: true });
    });

    test.each([
        ['without the address', { url: '' }],
        ['on localhost', { hostname: 'localhost' }],
        ['on a deploy preview', { hostname: 'deploy-preview-12--jclcheck.netlify.app' }],
        ['on www', { hostname: 'www.jclcheck.xyz' }],
        ['with Do Not Track', { doNotTrack: '1' }],
        ['with Global Privacy Control', { globalPrivacyControl: true }]
    ])('adds no script and counts nothing %s', (_, options) => {
        const fake = fakeEnv(options);
        expect(initAnalytics(fake.env)).toBe(false);
        expect(fake.scripts()).toHaveLength(0);
        pageview({ path: '/', fullPath: '/', meta: {} });
        track('sample', 'broken');
        expect(fake.win.goatcounter).toBeUndefined();
    });

    test('calls made before the script loads are delivered after it, in order', () => {
        const fake = fakeEnv();
        initAnalytics(fake.env);
        pageview({ path: '/app', fullPath: '/app', meta: { title: 'Workbench' } });
        track('sample', 'broken');

        const count = fake.load();
        expect(count.mock.calls).toEqual([
            [{ path: '/app', title: 'Workbench' }],
            [{ path: 'sample/broken', title: 'Load sample: broken', event: true }]
        ]);

        track('check', 'button');
        expect(count).toHaveBeenLastCalledWith({ path: 'check/button', title: 'Check JCL (button)', event: true });
    });

    test('a script that fails to load makes later calls do nothing, without throwing', () => {
        const fake = fakeEnv();
        initAnalytics(fake.env);
        track('sample', 'broken');
        fake.doc.querySelector('script').dispatchEvent(new Event('error'));

        expect(() => {
            track('sample', 'proc');
            pageview({ path: '/', fullPath: '/', meta: {} });
        }).not.toThrow();
        const count = vi.fn();
        fake.win.goatcounter = { count };
        expect(count).not.toHaveBeenCalled();
    });

    test('a detail that is not allowed sends nothing', () => {
        const fake = fakeEnv();
        initAnalytics(fake.env);
        const count = fake.load();
        track('sample', 'MY.SECRET.DSN');
        track('diag/seen', '//J1 JOB');
        track('no-such-event', 'x');
        expect(count).not.toHaveBeenCalled();
    });

    test('later page views send an empty referrer, the first keeps its own', () => {
        const fake = fakeEnv();
        initAnalytics(fake.env);
        const count = fake.load();
        pageview({ path: '/', fullPath: '/', meta: {} });
        pageview({ path: '/app', fullPath: '/app', meta: {} });
        expect(count.mock.calls[0][0]).not.toHaveProperty('referrer');
        expect(count.mock.calls[1][0].referrer).toBe('');
    });
});

describe('countedPath', () => {
    test('keeps only zos, jes, ref and utm_* and drops the hash', () => {
        expect(countedPath({ fullPath: '/app?zos=3.1&utm_source=x&name=SECRET#jcl=abc' })).toBe('/app?zos=3.1&utm_source=x');
    });

    test('keeps the path alone when no parameter is kept', () => {
        expect(countedPath({ fullPath: '/about?name=SECRET' })).toBe('/about');
    });

    test('counts the not-found route as /404', () => {
        expect(countedPath({ name: 'not-found', fullPath: '/wp-admin?x=1' })).toBe('/404');
    });

    test('a page view carries the route title', () => {
        const fake = fakeEnv();
        initAnalytics(fake.env);
        const count = fake.load();
        pageview({ path: '/app', fullPath: '/app?zos=3.1&utm_source=x&name=SECRET#jcl=abc', meta: { title: 'Workbench' } });
        expect(count).toHaveBeenCalledWith({ path: '/app?zos=3.1&utm_source=x', title: 'Workbench' });
    });
});

describe('allowed list', () => {
    test('every event has a title for each kind of detail', () => {
        for (const [name, entry] of Object.entries(EVENTS)) {
            expect(typeof entry.title, name).toBe('function');
            const sample = entry.details instanceof RegExp ? 'JCLK001' : entry.details[0];
            expect(entry.title(sample), name).toBeTruthy();
        }
    });

    test('the code pattern accepts codes and nothing else', () => {
        expect(CODE_PATTERN.test('JCLK001')).toBe(true);
        for (const value of ['JCLK01', 'JCL K001', 'MY.DSN', 'JCLK0011', 'jclk001', 'JCLK001\n']) {
            expect(CODE_PATTERN.test(value), JSON.stringify(value)).toBe(false);
        }
    });

    test('API error statuses are 400 to 599 only', () => {
        expect(isAllowed('api/error', '500')).toBe(true);
        expect(isAllowed('api/error', '404')).toBe(true);
        expect(isAllowed('api/error', '200')).toBe(false);
        expect(isAllowed('api/error', '5000')).toBe(false);
    });

    test('size buckets change at 10, 50, 200 and 1000 lines', () => {
        expect([1, 10, 11, 50, 51, 200, 201, 1000, 1001].map(sizeBucket)).toEqual([
            '1-10', '1-10', '11-50', '11-50', '51-200', '51-200', '201-1000', '201-1000', '1000+'
        ]);
    });
});

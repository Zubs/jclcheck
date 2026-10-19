import { describe, test, expect } from 'vitest';
import { encodeShare, decodeShare, shareLink, MAX_LINK_LENGTH } from '../src/share.js';

const PAYLOAD = {
    jcl: "//J JOB\n//S EXEC PGM=X,PARM='é ✓'",
    library: [
        { dsn: 'MY.PROCS', member: 'P1', source: '//P1 PROC' },
        { dsn: '', member: 'INC', source: '//D DD DUMMY' }
    ],
    zosLevel: '2.5',
    jes: 'JES3'
};

// Text that barely compresses, so its link length is predictable.
function noise(length, seed = 7) {
    let x = seed;
    return Array.from({ length }, () => {
        x = (Math.imul(x, 1664525) + 1013904223) >>> 0; // 32-bit, so it never loses precision
        return String.fromCharCode(33 + ((x >>> 24) % 90));
    }).join('');
}

describe('share links', () => {
    test('a payload round-trips exactly', async () => {
        const fragment = await encodeShare(PAYLOAD);
        expect(fragment).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(await decodeShare(fragment)).toEqual({ v: 1, ...PAYLOAD });
    });

    test('a cut-off or altered fragment is rejected', async () => {
        const fragment = await encodeShare(PAYLOAD);
        await expect(decodeShare(fragment.slice(0, fragment.length / 2))).rejects.toThrow();
        await expect(decodeShare('AAAA' + fragment.slice(4))).rejects.toThrow();
        await expect(decodeShare('not*base64')).rejects.toThrow();
    });

    test('the link carries the level and JES in the query and the content after #', async () => {
        const link = await shareLink('https://jclcheck.xyz', PAYLOAD);
        expect(link).toMatch(/^https:\/\/jclcheck\.xyz\/app\?zos=2\.5&jes=JES3#jcl=[A-Za-z0-9_-]+$/);
    });

    test('a link just under 32 KB is made and one just over is refused', async () => {
        const lengthFor = async n => (await shareLink('https://jclcheck.xyz', { ...PAYLOAD, jcl: noise(n), library: [] }))?.length;
        // Find the largest JCL that still fits, then go one step over.
        let low = 1000, high = 40000;
        while (high - low > 1) {
            const mid = Math.floor((low + high) / 2);
            if (await lengthFor(mid)) {
                low = mid;
            } else {
                high = mid;
            }
        }

        const fits = await lengthFor(low);
        expect(fits).toBeLessThanOrEqual(MAX_LINK_LENGTH);
        expect(fits).toBeGreaterThan(MAX_LINK_LENGTH - 200);
        expect(await lengthFor(low + 200)).toBeUndefined();
    });
});

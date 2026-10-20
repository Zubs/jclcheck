// Shareable links: the JCL, library members, site profile, z/OS level and JES, gzipped with
// the browser's CompressionStream and base64url-encoded after "#jcl=". The part
// after # never reaches a server, so nothing is stored or sent anywhere.

// Chat apps and email often cut longer links short.
export const MAX_LINK_LENGTH = 32 * 1024;

async function pipe(bytes, stream) {
    const out = await new Response(new Response(bytes).body.pipeThrough(stream)).arrayBuffer();
    return new Uint8Array(out);
}

function toBase64Url(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

/** @param {{ jcl: string, library: object[], profile?: string, zosLevel: string|null, jes: string|null }} payload */
export async function encodeShare(payload) {
    const json = new TextEncoder().encode(JSON.stringify({ v: 1, ...payload }));
    return toBase64Url(await pipe(json, new CompressionStream('gzip')));
}

/** Throws when the fragment is damaged or cut off. */
export async function decodeShare(fragment) {
    const json = new TextDecoder().decode(await pipe(fromBase64Url(fragment), new DecompressionStream('gzip')));
    const payload = JSON.parse(json);
    const text = v => typeof v === 'string';
    if (payload.v !== 1 || !text(payload.jcl) || !Array.isArray(payload.library) ||
        !payload.library.every(e => e && text(e.dsn) && text(e.member) && text(e.source)) ||
        (payload.profile !== undefined && !text(payload.profile))) {
        throw new Error('not a JCLcheck link');
    }

    return payload;
}

/** The full link for a payload, or null when it would be too long. */
export async function shareLink(origin, payload) {
    const query = new URLSearchParams();
    if (payload.zosLevel) {
        query.set('zos', payload.zosLevel);
    }

    if (payload.jes) {
        query.set('jes', payload.jes);
    }

    const search = query.toString();
    const link = `${origin}/app${search ? `?${search}` : ''}#jcl=${await encodeShare(payload)}`;
    return link.length <= MAX_LINK_LENGTH ? link : null;
}

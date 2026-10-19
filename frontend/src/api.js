const API_BASE = import.meta.env.VITE_API_BASE || '';

// Errors carry `status`: the HTTP status, or 0 when the API couldn't be reached.
function apiError(message, status) {
    const err = new Error(message);
    err.status = status;
    return err;
}

// `library` holds { dsn, member, source } entries for catalogued procedures
// and INCLUDE members; it's only sent when there is something in it.
// `zosLevel` and `jes` are sent when chosen; otherwise the API's defaults apply.
// `profile` is the site profile object, sent when there is one.
// `signal` lets the workbench abort a check that a newer one replaces.
export async function validateJcl(source, { library = [], zosLevel, jes, profile, signal } = {}) {
    let res;
    try {
        res = await fetch(`${API_BASE}/api/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Tells the backend this check is already counted in the browser.
                'X-JCLcheck-Client': 'workbench'
            },
            body: JSON.stringify({
                source,
                ...(library.length ? { library } : {}),
                ...(zosLevel ? { zosLevel } : {}),
                ...(jes ? { jes } : {}),
                ...(profile ? { profile } : {})
            }),
            signal
        });
    } catch (err) {
        throw apiError(`Validation request failed: ${err.message}`, 0);
    }

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        const err = apiError(`Validation request failed (${res.status}): ${text}`, res.status);
        // A 400 says which option was refused, for example the profile.
        try {
            err.detail = JSON.parse(text).message;
        } catch {
            // Not JSON: the status alone has to do.
        }

        throw err;
    }

    return res.json();
}

// The JCL laid out in the usual columns: { text, changed, notes, refused }.
export async function formatJcl(source) {
    let res;
    try {
        res = await fetch(`${API_BASE}/api/format`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-JCLcheck-Client': 'workbench' },
            body: JSON.stringify({ source })
        });
    } catch (err) {
        throw apiError(`Format request failed: ${err.message}`, 0);
    }

    if (!res.ok) {
        throw apiError(`Format request failed (${res.status})`, res.status);
    }

    return res.json();
}

// The z/OS levels the API supports, for the workbench's level picker.
export async function getLevels() {
    let res;
    try {
        res = await fetch(`${API_BASE}/api/levels`);
    } catch (err) {
        throw apiError(`Levels request failed: ${err.message}`, 0);
    }

    if (!res.ok) {
        throw apiError(`Levels request failed (${res.status})`, res.status);
    }

    return res.json();
}

const API_BASE = import.meta.env.VITE_API_BASE || '';

// Errors carry `status`: the HTTP status, or 0 when the API couldn't be reached.
function apiError(message, status) {
    const err = new Error(message);
    err.status = status;
    return err;
}

// `library` holds { dsn, member, source } entries for catalogued procedures
// and INCLUDE members; it's only sent when there is something in it.
export async function validateJcl(source, { library = [] } = {}) {
    let res;
    try {
        res = await fetch(`${API_BASE}/api/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Tells the backend this check is already counted in the browser.
                'X-JCLcheck-Client': 'workbench'
            },
            body: JSON.stringify(library.length ? { source, library } : { source })
        });
    } catch (err) {
        throw apiError(`Validation request failed: ${err.message}`, 0);
    }

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw apiError(`Validation request failed (${res.status}): ${text}`, res.status);
    }

    return res.json();
}

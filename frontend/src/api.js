const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function validateJcl(source) {
    const res = await fetch(`${API_BASE}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({source})
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Validation request failed (${res.status}): ${text}`);
    }

    return res.json();
}

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { validateJcl } from '../src/api.js';

let fetchMock;

beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
});

describe('validateJcl', () => {
    test('posts the JCL as JSON to /api/validate', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ diagnostics: [] }), { status: 200 }));
        await validateJcl('//J JOB');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe('/api/validate');
        expect(options.method).toBe('POST');
        expect(options.headers).toEqual({ 'Content-Type': 'application/json', 'X-JCLcheck-Client': 'workbench' });
        expect(options.body).toBe('{"source":"//J JOB"}');
    });

    test('returns the JSON result on success', async () => {
        const result = { diagnostics: [], stats: { valid: true } };
        fetchMock.mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }));
        await expect(validateJcl('//J JOB')).resolves.toEqual(result);
    });

    test('raises an error with the status and body when the response is not OK', async () => {
        fetchMock.mockResolvedValue(new Response('internal_error', { status: 500 }));
        await expect(validateJcl('//J JOB')).rejects.toThrow('Validation request failed (500): internal_error');
    });

    test('gives the error the HTTP status', async () => {
        fetchMock.mockResolvedValue(new Response('internal_error', { status: 500 }));
        await expect(validateJcl('//J JOB')).rejects.toMatchObject({ status: 500 });
    });

    test('gives status 0 when the API cannot be reached', async () => {
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
        await expect(validateJcl('//J JOB')).rejects.toMatchObject({ status: 0, message: 'Validation request failed: Failed to fetch' });
    });
});

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { validateJcl, getLevels } from '../src/api.js';

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

    test('passes the abort signal to fetch', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ diagnostics: [] }), { status: 200 }));
        const controller = new AbortController();
        await validateJcl('//J JOB', { signal: controller.signal });
        expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
    });

    test('sends the library only when it has members', async () => {
        fetchMock.mockImplementation(async () => new Response(JSON.stringify({ diagnostics: [] }), { status: 200 }));
        await validateJcl('//J JOB', { library: [] });
        expect(fetchMock.mock.calls[0][1].body).toBe('{"source":"//J JOB"}');
        const library = [{ dsn: 'MY.PROCS', member: 'P1', source: '//S EXEC PGM=X' }];
        await validateJcl('//J JOB', { library });
        expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ source: '//J JOB', library });
    });

    test('sends the z/OS level and JES when they are chosen', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ diagnostics: [] }), { status: 200 }));
        await validateJcl('//J JOB', { zosLevel: '2.5', jes: 'JES3' });
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ source: '//J JOB', zosLevel: '2.5', jes: 'JES3' });
    });

    test('getLevels reads /api/levels', async () => {
        const levels = { levels: [{ level: '3.2', jes3: false }], defaultLevel: '3.2', defaultJes: 'JES2' };
        fetchMock.mockResolvedValue(new Response(JSON.stringify(levels), { status: 200 }));
        await expect(getLevels()).resolves.toEqual(levels);
        expect(fetchMock.mock.calls[0][0]).toBe('/api/levels');
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

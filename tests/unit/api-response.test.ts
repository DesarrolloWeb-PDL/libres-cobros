import { describe, it, expect } from 'vitest';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';

describe('apiSuccess', () => {
  it('returns a Response with status 200', async () => {
    const res = apiSuccess({ foo: 'bar' });
    expect(res.status).toBe(200);
  });

  it('returns the data as JSON body', async () => {
    const data = { id: 1, name: 'test' };
    const res = apiSuccess(data);
    const body = await res.json();
    expect(body).toEqual(data);
  });
});

describe('apiError', () => {
  it('returns the specified status code', () => {
    const res = apiError('Not found', 404);
    expect(res.status).toBe(404);
  });

  it('returns error message in body', async () => {
    const res = apiError('Bad request', 400);
    const body = await res.json();
    expect(body).toEqual({ error: 'Bad request', details: undefined, code: undefined });
  });

  it('includes details and code when provided', async () => {
    const res = apiError('Validation failed', 422, 'field is required', 'VALIDATION_ERROR');
    const body = await res.json();
    expect(body).toEqual({
      error: 'Validation failed',
      details: 'field is required',
      code: 'VALIDATION_ERROR',
    });
  });
});

describe('apiDbError', () => {
  it('returns fallback message for non-Error values', async () => {
    const res = apiDbError('string error', 'DB failure');
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe('DB failure');
  });

  it('returns fallback for null/undefined', async () => {
    const res = apiDbError(null, 'Fallback msg');
    const body = await res.json();
    expect(body.error).toBe('Fallback msg');
  });

  it('maps DATABASE_URL missing to friendly message', async () => {
    const err = new Error('Environment variable not found: DATABASE_URL');
    const res = apiDbError(err, 'fallback');
    const body = await res.json();
    expect(body.error).toBe('Incomplete configuration: DATABASE_URL is missing');
  });

  it('maps POSTGRES_URL missing to friendly message', async () => {
    const err = new Error('Environment variable not found: POSTGRES_URL');
    const res = apiDbError(err, 'fallback');
    const body = await res.json();
    expect(body.error).toBe('Incomplete configuration: POSTGRES_URL is missing');
  });

  it('maps connection failure to friendly message', async () => {
    const err = new Error("Can't reach database server at localhost:5432");
    const res = apiDbError(err, 'fallback');
    const body = await res.json();
    expect(body.error).toBe('Unable to connect to the database');
  });

  it('maps missing table to migration message', async () => {
    const err = new Error('relation "public.Member" does not exist');
    const res = apiDbError(err, 'fallback');
    const body = await res.json();
    expect(body.error).toBe('Database is not migrated or tables are missing');
  });

  it('returns raw error message for unrecognized errors', async () => {
    const err = new Error('Some other prisma error');
    const res = apiDbError(err, 'fallback');
    const body = await res.json();
    expect(body.error).toBe('Some other prisma error');
  });

  it('includes the fallback as details', async () => {
    const err = new Error('Unknown error');
    const res = apiDbError(err, 'fallback context');
    const body = await res.json();
    expect(body.details).toBe('fallback context');
  });
});

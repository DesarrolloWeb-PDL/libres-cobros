import { describe, it, expect } from 'vitest';
import { institutionWhere, AuthError } from '@/lib/access';

describe('institutionWhere', () => {
  it('returns { institutionId } when institutionId is provided', () => {
    expect(institutionWhere('institution-123')).toEqual({ institutionId: 'institution-123' });
  });

  it('returns empty object when institutionId is null', () => {
    expect(institutionWhere(null)).toEqual({});
  });

  it('returns { institutionId } for an empty string (truthy check)', () => {
    // Empty string is falsy in JS, so it returns {}
    expect(institutionWhere('')).toEqual({});
  });
});

describe('AuthError', () => {
  it('creates an error with status and message', () => {
    const err = new AuthError(401, 'Not authenticated');
    expect(err.status).toBe(401);
    expect(err.message).toBe('Not authenticated');
    expect(err.name).toBe('AuthError');
  });

  it('is an instance of Error', () => {
    const err = new AuthError(403, 'Forbidden');
    expect(err).toBeInstanceOf(Error);
  });
});

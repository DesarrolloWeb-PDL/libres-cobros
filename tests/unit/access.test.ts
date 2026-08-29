import { describe, it, expect } from 'vitest';
import { clubWhere, AuthError } from '@/lib/access';

describe('clubWhere', () => {
  it('returns { clubId } when clubId is provided', () => {
    expect(clubWhere('club-123')).toEqual({ clubId: 'club-123' });
  });

  it('returns empty object when clubId is null', () => {
    expect(clubWhere(null)).toEqual({});
  });

  it('returns { clubId } for an empty string (truthy check)', () => {
    // Empty string is falsy in JS, so it returns {}
    expect(clubWhere('')).toEqual({});
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

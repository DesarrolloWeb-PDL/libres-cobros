import { describe, it, expect } from 'vitest';
import {
  MemberFormSchema,
  CreateMemberSchema,
  UpdateMemberSchema,
} from '@/types/member';

describe('MemberFormSchema', () => {
  const validData = {
    dni: '12345678',
    firstName: 'Juan',
    lastName: 'Pérez',
  };

  it('accepts valid minimal data', () => {
    const result = MemberFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts optional fields', () => {
    const result = MemberFormSchema.safeParse({
      ...validData,
      email: 'juan@test.com',
      phone: '555-1234',
      category: 'FAMILY',
      notes: 'Some note',
    });
    expect(result.success).toBe(true);
  });

  it('defaults category to ADULT', () => {
    const result = MemberFormSchema.parse(validData);
    expect(result.category).toBe('ADULT');
  });

  it('rejects empty dni', () => {
    const result = MemberFormSchema.safeParse({ ...validData, dni: '' });
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric dni', () => {
    const result = MemberFormSchema.safeParse({ ...validData, dni: 'ABC123' });
    expect(result.success).toBe(false);
  });

  it('rejects dni with special characters', () => {
    const result = MemberFormSchema.safeParse({ ...validData, dni: '12-345' });
    expect(result.success).toBe(false);
  });

  it('rejects empty firstName', () => {
    const result = MemberFormSchema.safeParse({ ...validData, firstName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty lastName', () => {
    const result = MemberFormSchema.safeParse({ ...validData, lastName: '' });
    expect(result.success).toBe(false);
  });

  it('accepts empty email string (optional)', () => {
    const result = MemberFormSchema.safeParse({ ...validData, email: '' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const result = MemberFormSchema.safeParse({ ...validData, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('accepts valid email', () => {
    const result = MemberFormSchema.safeParse({ ...validData, email: 'test@example.com' });
    expect(result.success).toBe(true);
  });
});

describe('CreateMemberSchema', () => {
  it('adds default status ACTIVE', () => {
    const result = CreateMemberSchema.parse({
      dni: '12345678',
      firstName: 'Juan',
      lastName: 'Pérez',
    });
    expect(result.status).toBe('ACTIVE');
  });

  it('accepts explicit status', () => {
    const result = CreateMemberSchema.parse({
      dni: '12345678',
      firstName: 'Juan',
      lastName: 'Pérez',
      status: 'INACTIVE',
    });
    expect(result.status).toBe('INACTIVE');
  });
});

describe('UpdateMemberSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = UpdateMemberSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial updates', () => {
    const result = UpdateMemberSchema.safeParse({ firstName: 'Updated' });
    expect(result.success).toBe(true);
  });

  it('still validates types when fields are provided', () => {
    const result = UpdateMemberSchema.safeParse({ dni: 'ABC' });
    expect(result.success).toBe(false);
  });
});

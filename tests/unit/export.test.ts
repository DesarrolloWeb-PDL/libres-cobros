import { describe, it, expect, vi } from 'vitest';
import { toCSV, downloadFile } from '@/lib/export';

describe('toCSV', () => {
  it('returns empty string for empty data', () => {
    expect(toCSV([])).toBe('');
  });

  it('converts objects to CSV with headers', () => {
    const data = [
      { name: 'Ana', age: 30, active: true },
      { name: 'Luis', age: 25, active: false },
    ];
    expect(toCSV(data)).toBe('name,age,active\nAna,30,true\nLuis,25,false');
  });

  it('escapes values containing commas', () => {
    const data = [{ note: 'Calle 1, 2do piso' }];
    expect(toCSV(data)).toBe('note\n"Calle 1, 2do piso"');
  });

  it('escapes values containing quotes', () => {
    const data = [{ note: 'Dice "hola"' }];
    expect(toCSV(data)).toBe('note\n"Dice ""hola"""');
  });

  it('escapes values containing newlines', () => {
    const data = [{ note: 'Línea 1\nLínea 2' }];
    expect(toCSV(data)).toBe('note\n"Línea 1\nLínea 2"');
  });

  it('serializes null and undefined as empty strings', () => {
    const data = [{ a: null, b: undefined, c: 'value' }];
    expect(toCSV(data)).toBe('a,b,c\n,,value');
  });

  it('serializes dates as ISO strings', () => {
    const date = new Date('2026-01-15T00:00:00.000Z');
    const data = [{ createdAt: date }];
    expect(toCSV(data)).toBe('createdAt\n2026-01-15T00:00:00.000Z');
  });
});

describe('downloadFile', () => {
  it('creates a temporary anchor and triggers download', () => {
    const revokeSpy = vi.fn();

    const urlSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURLSpy = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(revokeSpy);

    const realAnchor = document.createElement('a');
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(realAnchor);
    const removeSpy = vi.spyOn(realAnchor, 'remove').mockImplementation(() => undefined);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => realAnchor);

    downloadFile('content', 'file.csv', 'text/csv');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test');

    urlSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

import { mapTag } from './language.service';

describe('mapTag', () => {
  it('maps Spanish variants to es', () => {
    expect(mapTag('es')).toBe('es');
    expect(mapTag('es-AR')).toBe('es');
    expect(mapTag('ES-ES')).toBe('es');
  });

  it('maps Portuguese variants to pt-BR', () => {
    expect(mapTag('pt-BR')).toBe('pt-BR');
    expect(mapTag('pt')).toBe('pt-BR');
    expect(mapTag('pt-PT')).toBe('pt-BR');
  });

  it('falls back to en for unsupported or empty tags', () => {
    expect(mapTag('en')).toBe('en');
    expect(mapTag('en-US')).toBe('en');
    expect(mapTag('fr-FR')).toBe('en');
    expect(mapTag('')).toBe('en');
    expect(mapTag(null)).toBe('en');
    expect(mapTag(undefined)).toBe('en');
  });
});

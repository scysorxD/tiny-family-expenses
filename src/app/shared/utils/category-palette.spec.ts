import {
  categoryColor,
  categoryIcon,
  categoryPalette,
  categorySoftColor,
  resolveCategory,
} from './category-palette';

describe('category-palette', () => {
  it('maps known keywords to their icon and palette (case-insensitive)', () => {
    expect(resolveCategory('Farmacia del centro')).toEqual({
      icon: 'medkit-outline',
      palette: 'green',
    });
    expect(resolveCategory('TAXI al aeropuerto')).toEqual({
      icon: 'car-outline',
      palette: 'amber',
    });
    expect(categoryIcon('Cena con amigos')).toBe('restaurant-outline');
    expect(categoryPalette('Supermercado')).toBe('blue');
  });

  it('falls back to a deterministic palette for unknown names', () => {
    expect(resolveCategory('xyz')).toEqual({ icon: 'pricetag-outline', palette: 'amber' });
    // Stable across calls for the same input.
    expect(categoryPalette('Mascotas')).toBe(categoryPalette('Mascotas'));
    expect(categoryIcon('Mascotas')).toBe('pricetag-outline');
  });

  it('handles empty and nullish names without throwing', () => {
    expect(categoryIcon('')).toBe('pricetag-outline');
    expect(() => resolveCategory(undefined as unknown as string)).not.toThrow();
  });

  it('exposes css variable helpers based on the resolved palette', () => {
    expect(categoryColor('Farmacia')).toBe('var(--cat-green)');
    expect(categorySoftColor('Farmacia')).toBe('var(--cat-green-soft)');
  });
});

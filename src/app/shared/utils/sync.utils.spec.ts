import { classifySyncError, newId, nowIso } from './sync.utils';

describe('sync.utils', () => {
  describe('newId', () => {
    it('generates unique UUID-shaped ids', () => {
      const a = newId();
      const b = newId();
      expect(a).not.toEqual(b);
      expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('nowIso', () => {
    it('returns an ISO timestamp', () => {
      expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('classifySyncError', () => {
    it('treats closed-period business errors as conflicts', () => {
      expect(classifySyncError({ code: 'P0001', message: 'PERIOD_CLOSED' })).toBe('conflict');
    });

    it('treats archived room as a conflict', () => {
      expect(classifySyncError({ message: 'ROOM_ARCHIVED' })).toBe('conflict');
    });

    it('treats unique violations as conflicts', () => {
      expect(classifySyncError({ code: '23505', message: 'duplicate key value' })).toBe('conflict');
    });

    it('treats foreign-key/inactive references as conflicts', () => {
      expect(classifySyncError({ code: '23503' })).toBe('conflict');
    });

    it('treats network/timeout errors as retryable', () => {
      expect(classifySyncError({ message: 'Failed to fetch' })).toBe('retry');
      expect(classifySyncError(new Error('network timeout'))).toBe('retry');
    });

    it('defaults unknown errors to retry', () => {
      expect(classifySyncError(null)).toBe('retry');
      expect(classifySyncError({})).toBe('retry');
    });
  });
});

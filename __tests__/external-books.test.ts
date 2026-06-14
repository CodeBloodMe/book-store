import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchGoogleBooks, searchOpenLibrary, fetchExternalBookDetails } from '../lib/external-books';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('External Books Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('searchGoogleBooks', () => {
    it('returns an empty array when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const results = await searchGoogleBooks('test');
      expect(results).toEqual([]);
    });

    it('parses successful results correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: '123',
              volumeInfo: {
                title: 'Test Book',
                authors: ['Author 1'],
                averageRating: 4.5,
              },
            },
          ],
        }),
      });

      const results = await searchGoogleBooks('test');
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'ext_google_123',
        title: 'Test Book',
        author: 'Author 1',
        community_rating: 4.5,
        external_id: 'google:123',
      });
    });
  });

  describe('searchOpenLibrary', () => {
    it('returns an empty array when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const results = await searchOpenLibrary('test');
      expect(results).toEqual([]);
    });

    it('parses successful results correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          docs: [
            {
              key: '/works/OL123W',
              title: 'OL Test Book',
              author_name: ['Author 2'],
            },
          ],
        }),
      });

      const results = await searchOpenLibrary('test');
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'ext_ol_OL123W',
        title: 'OL Test Book',
        author: 'Author 2',
        external_id: 'ol:OL123W',
      });
    });
  });

  describe('fetchExternalBookDetails', () => {
    it('returns null for unknown source', async () => {
      const result = await fetchExternalBookDetails('unknown:123');
      expect(result).toBeNull();
    });

    it('fetches google book details correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          volumeInfo: {
            title: 'Detailed Google Book',
            authors: ['Author 3'],
          },
        }),
      });

      const result = await fetchExternalBookDetails('google:456');
      expect(result).toMatchObject({
        title: 'Detailed Google Book',
        author: 'Author 3',
        external_id: 'google:456',
      });
    });
  });
});

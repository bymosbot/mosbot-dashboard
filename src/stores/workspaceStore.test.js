import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkspaceStore } from './workspaceStore';
import { api } from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('workspaceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useWorkspaceStore.setState({
      listings: {},
      fileContents: {},
      isLoadingListing: false,
      isLoadingContent: false,
      listingError: null,
      contentError: null,
      selectedFile: null,
      currentPath: '/',
    });
  });

  describe('fetchListing', () => {
    it('successfully fetches workspace listing', async () => {
      const mockListing = {
        files: [
          { path: '/README.md', name: 'README.md', type: 'file', size: 1024 },
          { path: '/src', name: 'src', type: 'directory', size: 0 },
        ],
        count: 2,
        path: '/',
        recursive: false,
      };

      api.get.mockResolvedValue({
        data: {
          data: mockListing,
        },
      });

      const result = await useWorkspaceStore.getState().fetchListing({ path: '/', recursive: false });

      expect(api.get).toHaveBeenCalledWith('/openclaw/workspace/files', {
        params: { path: '/', recursive: 'false' }
      });
      expect(result).toEqual(mockListing);
      expect(useWorkspaceStore.getState().listings['/:false']).toEqual(mockListing);
      expect(useWorkspaceStore.getState().isLoadingListing).toBe(false);
      expect(useWorkspaceStore.getState().listingError).toBe(null);
    });

    it('successfully fetches recursive listing', async () => {
      const mockListing = {
        files: [
          { path: '/README.md', name: 'README.md', type: 'file', size: 1024 },
          { path: '/src/index.js', name: 'index.js', type: 'file', size: 2048 },
        ],
        count: 2,
        path: '/',
        recursive: true,
      };

      api.get.mockResolvedValue({
        data: {
          data: mockListing,
        },
      });

      const result = await useWorkspaceStore.getState().fetchListing({ path: '/', recursive: true });

      expect(api.get).toHaveBeenCalledWith('/openclaw/workspace/files', {
        params: { path: '/', recursive: 'true' }
      });
      expect(result).toEqual(mockListing);
      expect(useWorkspaceStore.getState().listings['/:true']).toEqual(mockListing);
    });

    it('uses cached listing when available and not forced', async () => {
      const mockListing = {
        files: [{ path: '/test.md', name: 'test.md', type: 'file', size: 512 }],
        count: 1,
      };

      // Set cached data
      useWorkspaceStore.setState({
        listings: {
          '/:false': mockListing,
        },
      });

      const result = await useWorkspaceStore.getState().fetchListing({ path: '/', recursive: false });

      expect(api.get).not.toHaveBeenCalled();
      expect(result).toEqual(mockListing);
    });

    it('bypasses cache when force is true', async () => {
      const cachedListing = {
        files: [{ path: '/old.md', name: 'old.md', type: 'file', size: 256 }],
      };

      const newListing = {
        files: [{ path: '/new.md', name: 'new.md', type: 'file', size: 512 }],
      };

      // Set cached data
      useWorkspaceStore.setState({
        listings: {
          '/:false': cachedListing,
        },
      });

      api.get.mockResolvedValue({
        data: {
          data: newListing,
        },
      });

      const result = await useWorkspaceStore.getState().fetchListing({ 
        path: '/', 
        recursive: false, 
        force: true 
      });

      expect(api.get).toHaveBeenCalled();
      expect(result).toEqual(newListing);
      expect(useWorkspaceStore.getState().listings['/:false']).toEqual(newListing);
    });

    it('sets loading state during fetch', async () => {
      api.get.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { data: { files: [], count: 0 } }
        }), 100))
      );

      const fetchPromise = useWorkspaceStore.getState().fetchListing({ path: '/' });

      expect(useWorkspaceStore.getState().isLoadingListing).toBe(true);

      await fetchPromise;
      expect(useWorkspaceStore.getState().isLoadingListing).toBe(false);
    });

    it('handles API errors correctly', async () => {
      const errorMessage = 'Failed to fetch workspace listing';
      api.get.mockRejectedValue({
        response: {
          data: {
            error: {
              message: errorMessage
            }
          }
        }
      });

      await expect(
        useWorkspaceStore.getState().fetchListing({ path: '/' })
      ).rejects.toBeTruthy();
      
      expect(useWorkspaceStore.getState().isLoadingListing).toBe(false);
      expect(useWorkspaceStore.getState().listingError).toBe(errorMessage);
    });
  });

  describe('fetchFileContent', () => {
    it('successfully fetches file content', async () => {
      const mockContent = {
        path: '/README.md',
        name: 'README.md',
        type: 'file',
        size: 1024,
        content: '# Hello World\n\nThis is a test.',
        encoding: 'utf8',
        modified: '2024-01-01T00:00:00Z',
      };

      api.get.mockResolvedValue({
        data: {
          data: mockContent,
        },
      });

      const result = await useWorkspaceStore.getState().fetchFileContent({ path: '/README.md' });

      expect(api.get).toHaveBeenCalledWith('/openclaw/workspace/files/content', {
        params: { path: '/README.md' }
      });
      expect(result).toEqual(mockContent);
      expect(useWorkspaceStore.getState().fileContents['/README.md']).toEqual(mockContent);
      expect(useWorkspaceStore.getState().isLoadingContent).toBe(false);
      expect(useWorkspaceStore.getState().contentError).toBe(null);
    });

    it('uses cached content when available and not forced', async () => {
      const mockContent = {
        path: '/test.md',
        content: 'Cached content',
      };

      // Set cached data
      useWorkspaceStore.setState({
        fileContents: {
          '/test.md': mockContent,
        },
      });

      const result = await useWorkspaceStore.getState().fetchFileContent({ path: '/test.md' });

      expect(api.get).not.toHaveBeenCalled();
      expect(result).toEqual(mockContent);
    });

    it('bypasses cache when force is true', async () => {
      const cachedContent = {
        content: 'Old content',
      };

      const newContent = {
        content: 'New content',
      };

      // Set cached data
      useWorkspaceStore.setState({
        fileContents: {
          '/test.md': cachedContent,
        },
      });

      api.get.mockResolvedValue({
        data: {
          data: newContent,
        },
      });

      const result = await useWorkspaceStore.getState().fetchFileContent({ 
        path: '/test.md', 
        force: true 
      });

      expect(api.get).toHaveBeenCalled();
      expect(result).toEqual(newContent);
      expect(useWorkspaceStore.getState().fileContents['/test.md']).toEqual(newContent);
    });

    it('sets loading state during fetch', async () => {
      api.get.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { data: { content: 'test' } }
        }), 100))
      );

      const fetchPromise = useWorkspaceStore.getState().fetchFileContent({ path: '/test.md' });

      expect(useWorkspaceStore.getState().isLoadingContent).toBe(true);

      await fetchPromise;
      expect(useWorkspaceStore.getState().isLoadingContent).toBe(false);
    });

    it('handles API errors correctly', async () => {
      const errorMessage = 'File not found';
      api.get.mockRejectedValue({
        response: {
          data: {
            error: {
              message: errorMessage
            }
          }
        }
      });

      await expect(
        useWorkspaceStore.getState().fetchFileContent({ path: '/missing.md' })
      ).rejects.toBeTruthy();
      
      expect(useWorkspaceStore.getState().isLoadingContent).toBe(false);
      expect(useWorkspaceStore.getState().contentError).toBe(errorMessage);
    });
  });

  describe('setSelectedFile', () => {
    it('sets the selected file', () => {
      const file = { path: '/test.md', name: 'test.md', type: 'file' };
      
      useWorkspaceStore.getState().setSelectedFile(file);
      
      expect(useWorkspaceStore.getState().selectedFile).toEqual(file);
    });

    it('can clear selected file with null', () => {
      const file = { path: '/test.md', name: 'test.md', type: 'file' };
      useWorkspaceStore.setState({ selectedFile: file });
      
      useWorkspaceStore.getState().setSelectedFile(null);
      
      expect(useWorkspaceStore.getState().selectedFile).toBe(null);
    });
  });

  describe('setCurrentPath', () => {
    it('sets the current path', () => {
      useWorkspaceStore.getState().setCurrentPath('/src/components');
      
      expect(useWorkspaceStore.getState().currentPath).toBe('/src/components');
    });
  });

  describe('cache management', () => {
    it('clears specific listing cache', () => {
      useWorkspaceStore.setState({
        listings: {
          '/:false': { files: [] },
          '/:true': { files: [] },
          '/src:false': { files: [] },
        },
      });

      useWorkspaceStore.getState().clearListingCache('/', false);

      expect(useWorkspaceStore.getState().listings['/:false']).toBeUndefined();
      expect(useWorkspaceStore.getState().listings['/:true']).toBeDefined();
      expect(useWorkspaceStore.getState().listings['/src:false']).toBeDefined();
    });

    it('clears all listing cache', () => {
      useWorkspaceStore.setState({
        listings: {
          '/:false': { files: [] },
          '/:true': { files: [] },
        },
      });

      useWorkspaceStore.getState().clearAllListingCache();

      expect(useWorkspaceStore.getState().listings).toEqual({});
    });

    it('clears specific file content cache', () => {
      useWorkspaceStore.setState({
        fileContents: {
          '/test1.md': { content: 'test1' },
          '/test2.md': { content: 'test2' },
        },
      });

      useWorkspaceStore.getState().clearContentCache('/test1.md');

      expect(useWorkspaceStore.getState().fileContents['/test1.md']).toBeUndefined();
      expect(useWorkspaceStore.getState().fileContents['/test2.md']).toBeDefined();
    });

    it('clears all content cache', () => {
      useWorkspaceStore.setState({
        fileContents: {
          '/test1.md': { content: 'test1' },
          '/test2.md': { content: 'test2' },
        },
      });

      useWorkspaceStore.getState().clearAllContentCache();

      expect(useWorkspaceStore.getState().fileContents).toEqual({});
    });
  });

  describe('refreshListing', () => {
    it('refreshes listing for current path', async () => {
      useWorkspaceStore.setState({ currentPath: '/src' });

      const mockListing = {
        files: [{ path: '/src/index.js', name: 'index.js', type: 'file' }],
      };

      api.get.mockResolvedValue({
        data: {
          data: mockListing,
        },
      });

      const result = await useWorkspaceStore.getState().refreshListing();

      expect(api.get).toHaveBeenCalledWith('/openclaw/workspace/files', {
        params: { path: '/src', recursive: 'false' }
      });
      expect(result).toEqual(mockListing);
    });
  });

  describe('clearErrors', () => {
    it('clears all error states', () => {
      useWorkspaceStore.setState({
        listingError: 'Listing error',
        contentError: 'Content error',
      });

      useWorkspaceStore.getState().clearErrors();

      expect(useWorkspaceStore.getState().listingError).toBe(null);
      expect(useWorkspaceStore.getState().contentError).toBe(null);
    });
  });
});

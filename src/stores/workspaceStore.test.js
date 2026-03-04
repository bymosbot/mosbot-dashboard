import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceStore } from './workspaceStore';
import { api } from '../api/client';
import logger from '../utils/logger';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const resetStore = () => {
  useWorkspaceStore.setState({
    listings: {},
    isLoadingListing: false,
    listingError: null,
    listingErrors: {},
    loadingListings: {},
    fileContents: {},
    isLoadingContent: false,
    contentError: null,
    loadingContents: {},
    selectedFile: null,
    currentPath: '/',
    workspaceRootPath: '',
  });
};

describe('workspaceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  describe('listing fetch', () => {
    it('fetches and caches listing data', async () => {
      api.get.mockResolvedValue({
        data: {
          data: {
            files: [{ path: '/README.md', name: 'README.md' }],
            count: 1,
          },
        },
      });

      const result = await useWorkspaceStore
        .getState()
        .fetchListing({ path: '/', recursive: false });

      expect(api.get).toHaveBeenCalledWith('/openclaw/workspace/files', {
        params: { path: '/', recursive: 'false' },
      });
      expect(result.files).toHaveLength(1);
      expect(useWorkspaceStore.getState().listings['coo:/:false']).toEqual(result);
    });

    it('returns cached listing when force is false', async () => {
      useWorkspaceStore.setState({
        listings: {
          'coo:/docs:false': { files: [{ path: '/docs/a.md' }] },
        },
      });

      const result = await useWorkspaceStore
        .getState()
        .fetchListing({ path: '/docs', recursive: false });

      expect(result).toEqual({ files: [{ path: '/docs/a.md' }] });
      expect(api.get).not.toHaveBeenCalled();
    });

    it('returns null when same listing request is already in flight', async () => {
      useWorkspaceStore.setState({
        loadingListings: { 'coo:/docs:false': true },
      });

      const result = await useWorkspaceStore
        .getState()
        .fetchListing({ path: '/docs', recursive: false });

      expect(result).toBe(null);
      expect(api.get).not.toHaveBeenCalled();
    });

    it('applies workspace root path and normalizes file paths', async () => {
      useWorkspaceStore.getState().setWorkspaceRootPath('/workspaces/main');
      api.get.mockResolvedValue({
        data: {
          data: {
            files: [
              { path: '/workspaces/main/docs/guide.md', name: 'guide.md' },
              { path: '/external/file.txt', name: 'file.txt' },
            ],
          },
        },
      });

      const result = await useWorkspaceStore.getState().fetchListing({ path: '/docs' });

      expect(api.get).toHaveBeenCalledWith('/openclaw/workspace/files', {
        params: { path: '/workspaces/main/docs', recursive: 'false' },
      });
      expect(result.files[0].path).toBe('/docs/guide.md');
      expect(result.files[1].path).toBe('/external/file.txt');
    });

    it('sets listing error with fallback message when request fails', async () => {
      api.get.mockRejectedValue(new Error('Network down'));

      await expect(useWorkspaceStore.getState().fetchListing({ path: '/' })).rejects.toBeTruthy();

      const state = useWorkspaceStore.getState();
      expect(state.listingError).toBe('Network down');
      expect(state.listingErrors['coo:/:false']).toBe('Network down');
      expect(state.loadingListings['coo:/:false']).toBeUndefined();
    });
  });

  describe('file content fetch', () => {
    it('fetches and caches file content', async () => {
      api.get.mockResolvedValue({
        data: {
          data: {
            path: '/README.md',
            content: 'hello',
          },
        },
      });

      const result = await useWorkspaceStore.getState().fetchFileContent({ path: '/README.md' });

      expect(api.get).toHaveBeenCalledWith('/openclaw/workspace/files/content', {
        params: { path: '/README.md' },
      });
      expect(result.content).toBe('hello');
      expect(useWorkspaceStore.getState().fileContents['coo:/README.md']).toEqual(result);
    });

    it('returns cached content and skips API call', async () => {
      useWorkspaceStore.setState({
        fileContents: {
          'coo:/cached.txt': { content: 'cached' },
        },
      });

      const result = await useWorkspaceStore.getState().fetchFileContent({ path: '/cached.txt' });

      expect(result).toEqual({ content: 'cached' });
      expect(api.get).not.toHaveBeenCalled();
    });

    it('returns null when same content request is already in flight', async () => {
      useWorkspaceStore.setState({
        loadingContents: { 'coo:/busy.txt': true },
      });

      const result = await useWorkspaceStore.getState().fetchFileContent({ path: '/busy.txt' });

      expect(result).toBe(null);
      expect(api.get).not.toHaveBeenCalled();
    });

    it('honors rawPath for direct absolute lookup', async () => {
      useWorkspaceStore.getState().setWorkspaceRootPath('/workspaces/main');
      api.get.mockResolvedValue({ data: { data: { content: 'raw' } } });

      await useWorkspaceStore.getState().fetchFileContent({
        path: '/already/absolute.txt',
        rawPath: true,
      });

      expect(api.get).toHaveBeenCalledWith('/openclaw/workspace/files/content', {
        params: { path: '/already/absolute.txt' },
      });
    });

    it('sets content error from thrown Error', async () => {
      api.get.mockRejectedValue(new Error('Socket timeout'));

      await expect(
        useWorkspaceStore.getState().fetchFileContent({ path: '/missing.txt' }),
      ).rejects.toBeTruthy();

      expect(useWorkspaceStore.getState().contentError).toBe('Socket timeout');
    });
  });

  describe('simple setters and cache helpers', () => {
    it('updates selected file and current path', () => {
      useWorkspaceStore.getState().setSelectedFile({ path: '/a.txt' });
      useWorkspaceStore.getState().setCurrentPath('/docs');
      expect(useWorkspaceStore.getState().selectedFile).toEqual({ path: '/a.txt' });
      expect(useWorkspaceStore.getState().currentPath).toBe('/docs');
    });

    it('sets workspace root path and resets to empty on falsy', () => {
      useWorkspaceStore.getState().setWorkspaceRootPath('/workspaces/main');
      expect(useWorkspaceStore.getState().workspaceRootPath).toBe('/workspaces/main');
      useWorkspaceStore.getState().setWorkspaceRootPath('');
      expect(useWorkspaceStore.getState().workspaceRootPath).toBe('');
    });

    it('clears specific and global caches/errors', () => {
      useWorkspaceStore.setState({
        listings: { 'coo:/:false': { files: [] } },
        listingErrors: { 'coo:/:false': 'err' },
        fileContents: { 'coo:/a.txt': { content: 'x' } },
        listingError: 'err1',
        contentError: 'err2',
      });

      useWorkspaceStore.getState().clearListingCache('/', false);
      useWorkspaceStore.getState().clearContentCache('/a.txt');
      expect(useWorkspaceStore.getState().listings['coo:/:false']).toBeUndefined();
      expect(useWorkspaceStore.getState().fileContents['coo:/a.txt']).toBeUndefined();

      useWorkspaceStore.getState().clearAllListingCache();
      useWorkspaceStore.getState().clearAllContentCache();
      useWorkspaceStore.getState().clearErrors();

      const state = useWorkspaceStore.getState();
      expect(state.listings).toEqual({});
      expect(state.fileContents).toEqual({});
      expect(state.listingError).toBe(null);
      expect(state.contentError).toBe(null);
      expect(state.listingErrors).toEqual({});
    });
  });

  describe('file mutations', () => {
    it('createFile creates file and invalidates parent listing cache', async () => {
      useWorkspaceStore.getState().setWorkspaceRootPath('/workspaces/main');
      useWorkspaceStore.setState({
        listings: {
          'coo:/src:false': { files: [] },
          'coo:/src:true': { files: [] },
        },
      });
      api.post.mockResolvedValue({ data: { data: { path: '/src/new.js' } } });

      const result = await useWorkspaceStore.getState().createFile({
        path: '/src/new.js',
        content: 'console.log(1)',
      });

      expect(api.post).toHaveBeenCalledWith('/openclaw/workspace/files', {
        path: '/workspaces/main/src/new.js',
        content: 'console.log(1)',
        encoding: 'utf8',
      });
      expect(result).toEqual({ path: '/src/new.js' });
      expect(useWorkspaceStore.getState().listings['coo:/src:false']).toBeUndefined();
      expect(useWorkspaceStore.getState().listings['coo:/src:true']).toBeUndefined();
    });

    it('updateFile updates content and invalidates related caches', async () => {
      useWorkspaceStore.setState({
        listings: {
          'coo:/src:false': { files: [] },
          'coo:/src:true': { files: [] },
        },
        fileContents: {
          'coo:/src/new.js': { content: 'old' },
        },
      });
      api.put.mockResolvedValue({ data: { data: { updated: true } } });

      const result = await useWorkspaceStore.getState().updateFile({
        path: '/src/new.js',
        content: 'new',
      });

      expect(api.put).toHaveBeenCalledWith('/openclaw/workspace/files', {
        path: '/src/new.js',
        content: 'new',
        encoding: 'utf8',
      });
      expect(result).toEqual({ updated: true });
      expect(useWorkspaceStore.getState().fileContents['coo:/src/new.js']).toBeUndefined();
      expect(useWorkspaceStore.getState().listings['coo:/src:false']).toBeUndefined();
      expect(useWorkspaceStore.getState().listings['coo:/src:true']).toBeUndefined();
    });

    it('deleteFile clears selected file and caches', async () => {
      useWorkspaceStore.setState({
        selectedFile: { path: '/src/new.js' },
        listings: {
          'coo:/src:false': { files: [] },
          'coo:/src:true': { files: [] },
        },
        fileContents: { 'coo:/src/new.js': { content: 'x' } },
      });
      api.delete.mockResolvedValue({});

      const result = await useWorkspaceStore.getState().deleteFile({ path: '/src/new.js' });

      expect(result).toBe(true);
      expect(useWorkspaceStore.getState().selectedFile).toBe(null);
      expect(useWorkspaceStore.getState().fileContents['coo:/src/new.js']).toBeUndefined();
      expect(useWorkspaceStore.getState().listings['coo:/src:false']).toBeUndefined();
      expect(useWorkspaceStore.getState().listings['coo:/src:true']).toBeUndefined();
    });

    it('createDirectory returns exists=true when directory already exists', async () => {
      api.get.mockResolvedValue({ data: { data: { files: [] } } });

      const result = await useWorkspaceStore.getState().createDirectory({ path: '/docs' });
      expect(result).toEqual({ path: '/docs/.gitkeep', exists: true });
      expect(api.post).not.toHaveBeenCalled();
    });

    it('createDirectory normalizes duplicate slashes before creating .gitkeep', async () => {
      api.get.mockRejectedValue({
        response: { status: 404, data: { error: { message: 'not found' } } },
      });
      api.post.mockResolvedValue({ data: { data: { path: '/docs/.gitkeep' } } });

      await useWorkspaceStore.getState().createDirectory({ path: '/docs/' });

      expect(api.get).toHaveBeenCalledWith('/openclaw/workspace/files', {
        params: { path: '/docs', recursive: 'false' },
        __suppressErrorStatuses: [404],
      });
      expect(api.post).toHaveBeenCalledWith(
        '/openclaw/workspace/files',
        {
          path: '/docs/.gitkeep',
          content: '',
          encoding: 'utf8',
        },
        {
          __suppressErrorStatuses: [409],
        },
      );
    });

    it('createDirectory throws formatted error for non-exists failures', async () => {
      api.get.mockRejectedValue({
        response: { status: 404, data: { error: { message: 'not found' } } },
      });
      api.post.mockRejectedValue(new Error('mkdir failed'));

      await expect(useWorkspaceStore.getState().createDirectory({ path: '/docs' })).rejects.toThrow(
        'mkdir failed',
      );
    });

    it('moveFile succeeds with read-create-delete flow', async () => {
      api.get.mockResolvedValue({
        data: { data: { content: 'hello', encoding: 'utf8' } },
      });
      api.post.mockResolvedValue({ data: { data: { path: '/dest/new.txt' } } });
      api.delete.mockResolvedValue({});
      useWorkspaceStore.setState({ selectedFile: { path: '/src/old.txt' } });

      const result = await useWorkspaceStore
        .getState()
        .moveFile({ sourcePath: '/src/old.txt', destinationPath: '/dest/new.txt' });

      expect(result).toBe(true);
      expect(api.get).toHaveBeenCalledWith('/openclaw/workspace/files/content', {
        params: { path: '/src/old.txt' },
      });
      expect(api.post).toHaveBeenCalledWith('/openclaw/workspace/files', {
        path: '/dest/new.txt',
        content: 'hello',
        encoding: 'utf8',
      });
      expect(useWorkspaceStore.getState().selectedFile).toBe(null);
    });

    it('moveFile rolls back destination file when source delete fails', async () => {
      api.get.mockResolvedValue({
        data: { data: { content: 'hello', encoding: 'utf8' } },
      });
      api.post.mockResolvedValue({ data: { data: { path: '/dest/new.txt' } } });
      api.delete.mockRejectedValueOnce(new Error('source delete failed')).mockResolvedValueOnce({});

      await expect(
        useWorkspaceStore
          .getState()
          .moveFile({ sourcePath: '/src/old.txt', destinationPath: '/dest/new.txt' }),
      ).rejects.toThrow('Move operation incomplete: source delete failed');

      expect(api.delete).toHaveBeenNthCalledWith(2, '/openclaw/workspace/files', {
        params: { path: '/dest/new.txt' },
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('moveFile reports rollback failure when destination cleanup also fails', async () => {
      api.get.mockResolvedValue({
        data: { data: { content: 'hello', encoding: 'utf8' } },
      });
      api.post.mockResolvedValue({ data: { data: { path: '/dest/new.txt' } } });
      api.delete
        .mockRejectedValueOnce(new Error('source delete failed'))
        .mockRejectedValueOnce(new Error('rollback delete failed'));

      await expect(
        useWorkspaceStore
          .getState()
          .moveFile({ sourcePath: '/src/old.txt', destinationPath: '/dest/new.txt' }),
      ).rejects.toThrow('Move operation incomplete: source delete failed');

      expect(logger.error).toHaveBeenCalled();
    });

    it('moveFile surfaces create failure with fallback message', async () => {
      api.get.mockResolvedValue({
        data: { data: { content: 'hello', encoding: 'utf8' } },
      });
      api.post.mockRejectedValue(new Error('create failed'));

      await expect(
        useWorkspaceStore
          .getState()
          .moveFile({ sourcePath: '/src/old.txt', destinationPath: '/dest/new.txt' }),
      ).rejects.toThrow('create failed');
    });
  });

  describe('refreshListing', () => {
    it('forces listing refresh for current path', async () => {
      useWorkspaceStore.setState({ currentPath: '/src' });
      api.get.mockResolvedValue({ data: { data: { files: [] } } });

      await useWorkspaceStore.getState().refreshListing();

      expect(api.get).toHaveBeenCalledWith('/openclaw/workspace/files', {
        params: { path: '/src', recursive: 'false' },
      });
    });
  });
});

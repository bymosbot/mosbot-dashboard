import { create } from 'zustand';
import { api } from '../api/client';
import logger from '../utils/logger';

const normalizeWorkspacePath = (value) => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '/';

  const normalized = raw.replace(/\/+/g, '/');
  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')) {
    return withLeadingSlash.replace(/\/+$/, '');
  }

  return withLeadingSlash;
};

const joinWorkspacePath = (base, child) => {
  const basePath = typeof base === 'string' ? base : '';
  const childPath = typeof child === 'string' ? child : '';
  return normalizeWorkspacePath(`${basePath}/${childPath}`);
};

export const useWorkspaceStore = create((set, get) => ({
  // Listing state
  listings: {}, // Cache keyed by `${agentId}:${path}:${recursive}`
  isLoadingListing: false,
  listingError: null,
  listingErrors: {}, // Errors keyed by `${agentId}:${path}:${recursive}` to prevent infinite retry loops
  loadingListings: {}, // Track which listings are currently being fetched

  // File content state
  fileContents: {}, // Cache keyed by `${agentId}:${path}`
  isLoadingContent: false,
  contentError: null,
  loadingContents: {}, // Track which files are currently being fetched

  // Current selection
  selectedFile: null,
  currentPath: '/',

  // Agent workspace root
  workspaceRootPath: '', // e.g. '/workspaces/main'

  // Set workspace root path (prefix for all API calls)
  setWorkspaceRootPath: (rootPath) => {
    set({ workspaceRootPath: rootPath || '' });
  },

  // Fetch workspace file listing
  fetchListing: async ({ path = '/', recursive = false, force = false, agentId = 'coo' }) => {
    const state = get();
    const rootPath = state.workspaceRootPath;
    const fullPath = rootPath ? `${rootPath}${path}` : path;
    const cacheKey = `${agentId}:${path}:${recursive}`;

    // Return cached if available and not forced
    if (!force && state.listings[cacheKey]) {
      return state.listings[cacheKey];
    }

    // Prevent concurrent fetches of the same listing
    if (state.loadingListings[cacheKey]) {
      return null;
    }

    set((state) => ({
      isLoadingListing: true,
      listingError: null,
      listingErrors: {
        ...state.listingErrors,
        [cacheKey]: null,
      },
      loadingListings: {
        ...state.loadingListings,
        [cacheKey]: true,
      },
    }));

    try {
      const response = await api.get('/openclaw/workspace/files', {
        params: { path: fullPath, recursive: recursive ? 'true' : 'false' },
      });

      const data = response.data.data;

      // Strip the rootPath prefix from returned file paths so they're relative to agent root
      const normalizedData = {
        ...data,
        files: (data.files || []).map((file) => ({
          ...file,
          path:
            rootPath && file.path.startsWith(rootPath)
              ? file.path.substring(rootPath.length) || '/'
              : file.path,
        })),
      };

      set((state) => {
        const newLoadingListings = { ...state.loadingListings };
        delete newLoadingListings[cacheKey];

        return {
          listings: {
            ...state.listings,
            [cacheKey]: normalizedData,
          },
          isLoadingListing: false,
          listingError: null,
          listingErrors: {
            ...state.listingErrors,
            [cacheKey]: null,
          },
          loadingListings: newLoadingListings,
        };
      });

      return normalizedData;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        'Failed to fetch workspace listing';

      set((state) => {
        const newLoadingListings = { ...state.loadingListings };
        delete newLoadingListings[cacheKey];

        return {
          listingError: errorMessage,
          listingErrors: {
            ...state.listingErrors,
            [cacheKey]: errorMessage,
          },
          isLoadingListing: false,
          loadingListings: newLoadingListings,
        };
      });

      throw error;
    }
  },

  // Fetch file content
  // Pass rawPath: true to use `path` as-is without prepending workspaceRootPath
  fetchFileContent: async ({ path, force = false, agentId = 'coo', rawPath = false }) => {
    const state = get();
    const rootPath = state.workspaceRootPath;
    const fullPath = rawPath || !rootPath ? path : `${rootPath}${path}`;
    const cacheKey = `${agentId}:${path}`;

    // Return cached if available and not forced
    if (!force && state.fileContents[cacheKey]) {
      return state.fileContents[cacheKey];
    }

    // Prevent concurrent fetches of the same file
    if (state.loadingContents[cacheKey]) {
      return null;
    }

    set((state) => ({
      isLoadingContent: true,
      contentError: null,
      loadingContents: {
        ...state.loadingContents,
        [cacheKey]: true,
      },
    }));

    try {
      const response = await api.get('/openclaw/workspace/files/content', {
        params: { path: fullPath },
      });

      const data = response.data.data;

      set((state) => {
        const newLoadingContents = { ...state.loadingContents };
        delete newLoadingContents[cacheKey];

        return {
          fileContents: {
            ...state.fileContents,
            [cacheKey]: data,
          },
          isLoadingContent: false,
          contentError: null,
          loadingContents: newLoadingContents,
        };
      });

      return data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message || error.message || 'Failed to fetch file content';

      set((state) => {
        const newLoadingContents = { ...state.loadingContents };
        delete newLoadingContents[cacheKey];

        return {
          contentError: errorMessage,
          isLoadingContent: false,
          loadingContents: newLoadingContents,
        };
      });

      throw error;
    }
  },

  // Set selected file
  setSelectedFile: (file) => {
    set({ selectedFile: file });
  },

  // Set current path (for breadcrumbs)
  setCurrentPath: (path) => {
    set({ currentPath: path });
  },

  // Clear cache for a specific path
  clearListingCache: (path, recursive, agentId = 'coo') => {
    const cacheKey = `${agentId}:${path}:${recursive}`;
    set((state) => {
      const newListings = { ...state.listings };
      delete newListings[cacheKey];
      const newListingErrors = { ...state.listingErrors };
      delete newListingErrors[cacheKey];
      return { listings: newListings, listingErrors: newListingErrors };
    });
  },

  // Clear all listing cache
  clearAllListingCache: () => {
    set({ listings: {}, listingErrors: {}, listingError: null });
  },

  // Clear file content cache
  clearContentCache: (path, agentId = 'coo') => {
    const cacheKey = `${agentId}:${path}`;
    set((state) => {
      const newContents = { ...state.fileContents };
      delete newContents[cacheKey];
      return { fileContents: newContents };
    });
  },

  // Clear all content cache
  clearAllContentCache: () => {
    set({ fileContents: {}, contentError: null });
  },

  // Refresh current listing
  refreshListing: async () => {
    const { currentPath } = get();
    return get().fetchListing({ path: currentPath, force: true });
  },

  // Clear errors
  clearErrors: () => {
    set({ listingError: null, contentError: null, listingErrors: {} });
  },

  // Create a new file
  createFile: async ({ path, content = '', encoding = 'utf8', agentId = 'coo' }) => {
    try {
      const state = get();
      const rootPath = state.workspaceRootPath;
      const fullPath = rootPath ? `${rootPath}${path}` : path;

      const response = await api.post('/openclaw/workspace/files', {
        path: fullPath,
        content,
        encoding,
      });

      // Invalidate parent directory cache after successful creation
      const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
      get().clearListingCache(parentPath, false, agentId);
      get().clearListingCache(parentPath, true, agentId);

      return response.data.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message || error.message || 'Failed to create file';
      throw new Error(errorMessage);
    }
  },

  // Update an existing file
  updateFile: async ({ path, content, encoding = 'utf8', agentId = 'coo' }) => {
    try {
      const state = get();
      const rootPath = state.workspaceRootPath;
      const fullPath = rootPath ? `${rootPath}${path}` : path;

      const response = await api.put('/openclaw/workspace/files', {
        path: fullPath,
        content,
        encoding,
      });

      // Invalidate file content cache and parent directory cache after successful update
      get().clearContentCache(path, agentId);
      const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
      get().clearListingCache(parentPath, false, agentId);
      get().clearListingCache(parentPath, true, agentId);

      return response.data.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message || error.message || 'Failed to update file';
      throw new Error(errorMessage);
    }
  },

  // Delete a file or directory
  deleteFile: async ({ path, agentId = 'coo' }) => {
    try {
      const state = get();
      const rootPath = state.workspaceRootPath;
      const fullPath = rootPath ? `${rootPath}${path}` : path;

      await api.delete('/openclaw/workspace/files', {
        params: { path: fullPath },
      });

      // Invalidate caches after successful deletion
      get().clearContentCache(path, agentId);
      const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
      get().clearListingCache(parentPath, false, agentId);
      get().clearListingCache(parentPath, true, agentId);

      // If deleted item was selected, clear selection
      const { selectedFile } = get();
      if (selectedFile?.path === path) {
        set({ selectedFile: null });
      }

      return true;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message || error.message || 'Failed to delete file';
      throw new Error(errorMessage);
    }
  },

  // Create a new directory
  createDirectory: async ({ path, agentId = 'coo' }) => {
    const normalizedPath = normalizeWorkspacePath(path);
    const gitkeepPath = normalizeWorkspacePath(`${normalizedPath}/.gitkeep`);

    try {
      const state = get();
      const rootPath = state.workspaceRootPath;
      const fullDirectoryPath = rootPath
        ? joinWorkspacePath(rootPath, normalizedPath)
        : normalizedPath;

      // Fast path: if directory already exists, skip creating .gitkeep to avoid expected 409s.
      try {
        await api.get('/openclaw/workspace/files', {
          params: { path: fullDirectoryPath, recursive: 'false' },
          __suppressErrorStatuses: [404],
        });
        return { path: gitkeepPath, exists: true };
      } catch (error) {
        if (error.response?.status !== 404) {
          const errorMessage =
            error.response?.data?.error?.message ||
            error.message ||
            'Failed to check directory existence';
          throw new Error(errorMessage);
        }
      }

      // Directory is missing, create it by writing a .gitkeep file.
      const fullGitkeepPath = rootPath
        ? joinWorkspacePath(rootPath, gitkeepPath)
        : normalizeWorkspacePath(gitkeepPath);

      const response = await api.post(
        '/openclaw/workspace/files',
        {
          path: fullGitkeepPath,
          content: '',
          encoding: 'utf8',
        },
        {
          __suppressErrorStatuses: [409],
        },
      );

      // Invalidate parent directory cache after successful creation
      const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/')) || '/';
      get().clearListingCache(parentPath, false, agentId);
      get().clearListingCache(parentPath, true, agentId);

      return response.data.data;
    } catch (error) {
      // If file already exists (409), that's fine - directory already exists
      if (
        error.response?.status === 409 ||
        error.response?.data?.error?.code === 'FILE_EXISTS' ||
        error.response?.data?.error?.message?.includes('already exists')
      ) {
        // Directory already exists, return success
        return { path: gitkeepPath, exists: true };
      }

      // For other errors, throw as before
      const errorMessage =
        error.response?.data?.error?.message || error.message || 'Failed to create directory';
      throw new Error(errorMessage);
    }
  },

  // Move/rename a file or directory
  moveFile: async ({ sourcePath, destinationPath }) => {
    let fileCreated = false;

    // Log move operation start
    logger.info('Move operation started', {
      sourcePath,
      destinationPath,
      operation: 'moveFile',
    });

    try {
      // For files: read content, create at new location, delete old location
      // For directories: not supported yet (would need recursive operation)

      // First, fetch the file content
      const contentResponse = await api.get('/openclaw/workspace/files/content', {
        params: { path: sourcePath },
      });

      const { content, encoding } = contentResponse.data.data;

      // Create file at new location
      await api.post('/openclaw/workspace/files', {
        path: destinationPath,
        content,
        encoding: encoding || 'utf8',
      });
      fileCreated = true;

      logger.info('File created at destination', {
        sourcePath,
        destinationPath,
        operation: 'moveFile',
        step: 'create',
      });

      // Delete old file
      try {
        await api.delete('/openclaw/workspace/files', {
          params: { path: sourcePath },
        });

        logger.info('Move operation completed successfully', {
          sourcePath,
          destinationPath,
          operation: 'moveFile',
          step: 'complete',
        });
      } catch (deleteError) {
        // Rollback: if delete fails, attempt to remove the newly created file
        // to prevent orphaned files
        logger.error('Failed to delete source file after move. Attempting rollback', deleteError, {
          sourcePath,
          destinationPath,
          operation: 'moveFile',
          step: 'delete',
          rollback: true,
        });

        try {
          await api.delete('/openclaw/workspace/files', {
            params: { path: destinationPath },
          });
          logger.info('Rollback successful: removed destination file', {
            sourcePath,
            destinationPath,
            operation: 'moveFile',
            step: 'rollback',
            success: true,
          });
        } catch (rollbackError) {
          // Rollback failed - log error but don't throw (we'll throw the original delete error)
          logger.error('Rollback failed: could not remove destination file', rollbackError, {
            sourcePath,
            destinationPath,
            operation: 'moveFile',
            step: 'rollback',
            success: false,
            orphanedFile: destinationPath,
          });
        }

        // Invalidate caches before throwing error
        const sourceParent = sourcePath.substring(0, sourcePath.lastIndexOf('/')) || '/';
        const destParent = destinationPath.substring(0, destinationPath.lastIndexOf('/')) || '/';

        get().clearListingCache(sourceParent, false);
        get().clearListingCache(sourceParent, true);
        get().clearListingCache(destParent, false);
        get().clearListingCache(destParent, true);
        get().clearContentCache(sourcePath);
        get().clearContentCache(destinationPath);

        const deleteErrorMessage =
          deleteError.response?.data?.error?.message ||
          deleteError.message ||
          'Failed to delete source file';
        throw new Error(
          `Move operation incomplete: ${deleteErrorMessage}. File may exist at both locations.`,
        );
      }

      // Invalidate caches for both source and destination directories
      const sourceParent = sourcePath.substring(0, sourcePath.lastIndexOf('/')) || '/';
      const destParent = destinationPath.substring(0, destinationPath.lastIndexOf('/')) || '/';

      get().clearListingCache(sourceParent, false);
      get().clearListingCache(sourceParent, true);
      get().clearListingCache(destParent, false);
      get().clearListingCache(destParent, true);
      get().clearContentCache(sourcePath);

      // If moved item was selected, update selection
      const { selectedFile } = get();
      if (selectedFile?.path === sourcePath) {
        set({ selectedFile: null });
      }

      return true;
    } catch (error) {
      // If file was created but we're throwing an error, invalidate destination cache
      if (fileCreated) {
        const destParent = destinationPath.substring(0, destinationPath.lastIndexOf('/')) || '/';
        get().clearListingCache(destParent, false);
        get().clearListingCache(destParent, true);
        get().clearContentCache(destinationPath);
      }

      logger.error('Move operation failed', error, {
        sourcePath,
        destinationPath,
        operation: 'moveFile',
        fileCreated,
        step: fileCreated ? 'delete' : 'create',
      });

      const errorMessage =
        error.response?.data?.error?.message || error.message || 'Failed to move file';
      throw new Error(errorMessage);
    }
  },
}));

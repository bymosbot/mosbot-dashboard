import { create } from 'zustand';
import { api } from '../api/client';
import logger from '../utils/logger';

export const useWorkspaceStore = create((set, get) => ({
  // Listing state
  listings: {}, // Cache keyed by `${path}:${recursive}`
  isLoadingListing: false,
  listingError: null,
  listingErrors: {}, // Errors keyed by `${path}:${recursive}` to prevent infinite retry loops
  
  // File content state
  fileContents: {}, // Cache keyed by path
  isLoadingContent: false,
  contentError: null,
  
  // Current selection
  selectedFile: null,
  currentPath: '/',
  
  // Fetch workspace file listing
  fetchListing: async ({ path = '/', recursive = false, force = false }) => {
    const cacheKey = `${path}:${recursive}`;
    const state = get();
    
    // Return cached if available and not forced
    if (!force && state.listings[cacheKey]) {
      return state.listings[cacheKey];
    }
    
    set((state) => ({
      isLoadingListing: true,
      listingError: null,
      listingErrors: {
        ...state.listingErrors,
        [cacheKey]: null,
      },
    }));
    
    try {
      const response = await api.get('/openclaw/workspace/files', {
        params: { path, recursive: recursive ? 'true' : 'false' }
      });
      
      const data = response.data.data;
      
      set((state) => ({
        listings: {
          ...state.listings,
          [cacheKey]: data
        },
        isLoadingListing: false,
        listingError: null,
        listingErrors: {
          ...state.listingErrors,
          [cacheKey]: null,
        },
      }));
      
      return data;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message 
        || error.message 
        || 'Failed to fetch workspace listing';
      
      set((state) => ({ 
        listingError: errorMessage,
        listingErrors: {
          ...state.listingErrors,
          [cacheKey]: errorMessage,
        },
        isLoadingListing: false,
      }));
      
      throw error;
    }
  },
  
  // Fetch file content
  fetchFileContent: async ({ path, force = false }) => {
    const state = get();
    
    // Return cached if available and not forced
    if (!force && state.fileContents[path]) {
      return state.fileContents[path];
    }
    
    set({ isLoadingContent: true, contentError: null });
    
    try {
      const response = await api.get('/openclaw/workspace/files/content', {
        params: { path }
      });
      
      const data = response.data.data;
      
      set((state) => ({
        fileContents: {
          ...state.fileContents,
          [path]: data
        },
        isLoadingContent: false,
        contentError: null
      }));
      
      return data;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message 
        || error.message 
        || 'Failed to fetch file content';
      
      set({ 
        contentError: errorMessage, 
        isLoadingContent: false 
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
  clearListingCache: (path, recursive) => {
    const cacheKey = `${path}:${recursive}`;
    set((state) => {
      const newListings = { ...state.listings };
      delete newListings[cacheKey];
      return { listings: newListings };
    });
  },
  
  // Clear all listing cache
  clearAllListingCache: () => {
    set({ listings: {} });
  },
  
  // Clear file content cache
  clearContentCache: (path) => {
    set((state) => {
      const newContents = { ...state.fileContents };
      delete newContents[path];
      return { fileContents: newContents };
    });
  },
  
  // Clear all content cache
  clearAllContentCache: () => {
    set({ fileContents: {} });
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
  createFile: async ({ path, content = '', encoding = 'utf8' }) => {
    try {
      const response = await api.post('/openclaw/workspace/files', {
        path,
        content,
        encoding
      });
      
      // Invalidate parent directory cache after successful creation
      const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
      get().clearListingCache(parentPath, false);
      get().clearListingCache(parentPath, true);
      
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message 
        || error.message 
        || 'Failed to create file';
      throw new Error(errorMessage);
    }
  },
  
  // Update an existing file
  updateFile: async ({ path, content, encoding = 'utf8' }) => {
    try {
      const response = await api.put('/openclaw/workspace/files', {
        path,
        content,
        encoding
      });
      
      // Invalidate file content cache and parent directory cache after successful update
      get().clearContentCache(path);
      const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
      get().clearListingCache(parentPath, false);
      get().clearListingCache(parentPath, true);
      
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message 
        || error.message 
        || 'Failed to update file';
      throw new Error(errorMessage);
    }
  },
  
  // Delete a file or directory
  deleteFile: async ({ path }) => {
    try {
      await api.delete('/openclaw/workspace/files', {
        params: { path }
      });
      
      // Invalidate caches after successful deletion
      get().clearContentCache(path);
      const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
      get().clearListingCache(parentPath, false);
      get().clearListingCache(parentPath, true);
      
      // If deleted item was selected, clear selection
      const { selectedFile } = get();
      if (selectedFile?.path === path) {
        set({ selectedFile: null });
      }
      
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message 
        || error.message 
        || 'Failed to delete file';
      throw new Error(errorMessage);
    }
  },
  
  // Create a new directory
  createDirectory: async ({ path }) => {
    try {
      // Create directory by creating a .gitkeep file inside it
      const gitkeepPath = `${path}/.gitkeep`;
      const response = await api.post('/openclaw/workspace/files', {
        path: gitkeepPath,
        content: '',
        encoding: 'utf8'
      });
      
      // Invalidate parent directory cache after successful creation
      const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
      get().clearListingCache(parentPath, false);
      get().clearListingCache(parentPath, true);
      
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message 
        || error.message 
        || 'Failed to create directory';
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
      operation: 'moveFile'
    });
    
    try {
      // For files: read content, create at new location, delete old location
      // For directories: not supported yet (would need recursive operation)
      
      // First, fetch the file content
      const contentResponse = await api.get('/openclaw/workspace/files/content', {
        params: { path: sourcePath }
      });
      
      const { content, encoding } = contentResponse.data.data;
      
      // Create file at new location
      await api.post('/openclaw/workspace/files', {
        path: destinationPath,
        content,
        encoding: encoding || 'utf8'
      });
      fileCreated = true;
      
      logger.info('File created at destination', {
        sourcePath,
        destinationPath,
        operation: 'moveFile',
        step: 'create'
      });
      
      // Delete old file
      try {
        await api.delete('/openclaw/workspace/files', {
          params: { path: sourcePath }
        });
        
        logger.info('Move operation completed successfully', {
          sourcePath,
          destinationPath,
          operation: 'moveFile',
          step: 'complete'
        });
      } catch (deleteError) {
        // Rollback: if delete fails, attempt to remove the newly created file
        // to prevent orphaned files
        logger.error('Failed to delete source file after move. Attempting rollback', deleteError, {
          sourcePath,
          destinationPath,
          operation: 'moveFile',
          step: 'delete',
          rollback: true
        });
        
        try {
          await api.delete('/openclaw/workspace/files', {
            params: { path: destinationPath }
          });
          logger.info('Rollback successful: removed destination file', {
            sourcePath,
            destinationPath,
            operation: 'moveFile',
            step: 'rollback',
            success: true
          });
        } catch (rollbackError) {
          // Rollback failed - log error but don't throw (we'll throw the original delete error)
          logger.error('Rollback failed: could not remove destination file', rollbackError, {
            sourcePath,
            destinationPath,
            operation: 'moveFile',
            step: 'rollback',
            success: false,
            orphanedFile: destinationPath
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
        
        const deleteErrorMessage = deleteError.response?.data?.error?.message 
          || deleteError.message 
          || 'Failed to delete source file';
        throw new Error(`Move operation incomplete: ${deleteErrorMessage}. File may exist at both locations.`);
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
        step: fileCreated ? 'delete' : 'create'
      });
      
      const errorMessage = error.response?.data?.error?.message 
        || error.message 
        || 'Failed to move file';
      throw new Error(errorMessage);
    }
  }
}));

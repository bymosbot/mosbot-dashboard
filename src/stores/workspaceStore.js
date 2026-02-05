import { create } from 'zustand';
import { api } from '../api/client';

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
      
      // Invalidate parent directory cache
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
      
      // Invalidate file content cache and parent directory cache
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
      
      // Invalidate caches
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
      
      // Invalidate parent directory cache
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
  }
}));

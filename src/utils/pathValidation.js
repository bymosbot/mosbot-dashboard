/**
 * Path validation utilities for workspace file and folder operations
 * 
 * Provides consistent validation logic for file/folder names and paths
 * to prevent security issues (path traversal, invalid characters) and conflicts.
 */

/**
 * Invalid characters regex for filenames/foldernames
 * Matches: < > : " | ? * and control characters (\x00-\x1F)
 */
// eslint-disable-next-line no-control-regex
const INVALID_CHARS_REGEX = /[<>:"|?*\x00-\x1F]/g;

/**
 * Validates a filename or folder name for invalid characters
 * 
 * @param {string} name - The name to validate
 * @returns {Object} - { isValid: boolean, error: string | null }
 */
export const validateName = (name) => {
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return {
      isValid: false,
      error: 'Name is required'
    };
  }
  
  if (INVALID_CHARS_REGEX.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Name contains invalid characters'
    };
  }
  
  return {
    isValid: true,
    error: null
  };
};

/**
 * Validates a file path (supports nested paths)
 * 
 * @param {string} path - The path to validate (e.g., "docs/README.md" or "example.txt")
 * @param {Object} options - Validation options
 * @param {boolean} options.allowNested - Whether to allow nested paths (default: true)
 * @returns {Object} - { isValid: boolean, error: string | null }
 */
export const validateFilePath = (path, options = {}) => {
  const { allowNested = true } = options;
  const trimmedPath = path.trim();
  
  if (!trimmedPath) {
    return {
      isValid: false,
      error: 'Path is required'
    };
  }
  
  // Check for path traversal attempts
  if (trimmedPath.includes('..')) {
    return {
      isValid: false,
      error: 'Path cannot contain ..'
    };
  }
  
  // Check for invalid characters
  if (INVALID_CHARS_REGEX.test(trimmedPath)) {
    return {
      isValid: false,
      error: 'Path contains invalid characters'
    };
  }
  
  // If nested paths are not allowed, check for slashes
  if (!allowNested && trimmedPath.includes('/')) {
    return {
      isValid: false,
      error: 'Path cannot contain /'
    };
  }
  
  // If path contains /, validate that it ends with a filename
  if (trimmedPath.includes('/')) {
    const parts = trimmedPath.split('/').filter(Boolean);
    if (parts.length === 0 || parts[parts.length - 1].trim() === '') {
      return {
        isValid: false,
        error: 'Path must end with a filename'
      };
    }
    
    // Check each path segment for invalid chars
    for (const part of parts) {
      if (INVALID_CHARS_REGEX.test(part)) {
        return {
          isValid: false,
          error: 'Path segments contain invalid characters'
        };
      }
    }
  }
  
  return {
    isValid: true,
    error: null
  };
};

/**
 * Validates a folder name (does not allow nested paths)
 * 
 * @param {string} name - The folder name to validate
 * @returns {Object} - { isValid: boolean, error: string | null }
 */
export const validateFolderName = (name) => {
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return {
      isValid: false,
      error: 'Folder name is required'
    };
  }
  
  // Check for invalid characters
  if (INVALID_CHARS_REGEX.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Folder name contains invalid characters'
    };
  }
  
  // Check for path traversal and nested paths
  if (trimmedName.includes('..') || trimmedName.includes('/')) {
    return {
      isValid: false,
      error: 'Folder name cannot contain / or ..'
    };
  }
  
  return {
    isValid: true,
    error: null
  };
};

/**
 * Builds a full path from a base path and a relative path/name
 * 
 * @param {string} basePath - The base path (e.g., "/" or "/docs")
 * @param {string} relativePath - The relative path or name (e.g., "README.md" or "guides/setup.md")
 * @returns {string} - The normalized full path
 */
export const buildFullPath = (basePath, relativePath) => {
  const trimmedRelative = relativePath.trim();
  
  // If relative path starts with /, it's an absolute path
  if (trimmedRelative.startsWith('/')) {
    return trimmedRelative.replace(/\/+/g, '/');
  }
  
  // Build path from base
  let fullPath;
  if (basePath === '/') {
    fullPath = `/${trimmedRelative}`;
  } else {
    fullPath = `${basePath}/${trimmedRelative}`;
  }
  
  // Normalize path to remove duplicate slashes
  return fullPath.replace(/\/+/g, '/');
};

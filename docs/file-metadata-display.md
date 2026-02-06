# File Metadata Display for Restricted Files

## Overview

Enhanced the restricted file view to display file metadata (size and modified date) even when users don't have permission to read the file content. This provides better transparency and context for regular users browsing workspace files.

## Problem

Previously, when a regular user clicked on a file they couldn't read, they would only see:

```bash
📄 example.txt
🔒 Access restricted
```

This didn't provide any information about the file, making it difficult to:

- Understand if the file is large or small
- Know when it was last updated
- Determine if it's worth requesting access

## Solution

The file listing API (`GET /openclaw/workspace/files`) already returns metadata for all files:

```json
{
  "name": "example.txt",
  "path": "/example.txt",
  "type": "file",
  "size": 1024,
  "modified": "2026-02-05T12:34:56.789Z"
}
```

Since regular users can now access this endpoint, we can display this metadata even when they can't read the content.

## Implementation

### File: `src/components/FilePreview.jsx`

**Updated the restricted view header** to show file metadata:

**Before:**

```javascript
<div className="flex-1">
  <h3 className="font-semibold text-dark-100">{file.name}</h3>
  <p className="text-xs text-dark-400 flex items-center gap-2">
    <LockClosedIcon className="w-3 h-3" />
    Access restricted
  </p>
</div>
```

**After:**

```javascript
<div className="flex-1">
  <h3 className="font-semibold text-dark-100">{file.name}</h3>
  <p className="text-xs text-dark-400 flex items-center gap-2">
    {file.size && (
      <>
        {(file.size / 1024).toLocaleString(undefined, { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })} KB
        <span className="text-dark-600">•</span>
      </>
    )}
    {file.modified && (
      <>
        Modified {new Date(file.modified).toLocaleString()}
        <span className="text-dark-600">•</span>
      </>
    )}
    <LockClosedIcon className="w-3 h-3" />
    Access restricted
  </p>
</div>
```

## User Experience

### Before

```bash
┌─────────────────────────────────────────────┐
│ 📄 example.txt                              │
│ 🔒 Access restricted                        │
└─────────────────────────────────────────────┘
```

### After

```bash
┌─────────────────────────────────────────────┐
│ 📄 example.txt                              │
│ 2.50 KB • Modified 2/6/2026, 3:45:23 PM •  │
│ 🔒 Access restricted                        │
└─────────────────────────────────────────────┘
```

## Benefits

### For Regular Users

1. **Better Context**: Can see file size and modification date
2. **Informed Decisions**: Can decide if file is worth requesting access to
3. **Transparency**: More information about workspace contents
4. **Consistency**: Same metadata format as when viewing content

### For Admins

1. **Reduced Questions**: Users can see basic info without asking
2. **Better Requests**: Users can reference specific files by size/date
3. **Less Friction**: Users feel more informed, less locked out

## Data Source

The metadata comes from the file listing endpoint that regular users can already access:

```javascript
// This endpoint is now accessible to all authenticated users
GET /api/v1/openclaw/workspace/files?path=/&recursive=false

// Response includes metadata for each file
{
  "data": {
    "files": [
      {
        "name": "example.txt",
        "path": "/example.txt",
        "type": "file",
        "size": 1024,              // ← Available in listing
        "modified": "2026-02-05T..." // ← Available in listing
      }
    ]
  }
}
```

**No additional API calls needed** - the metadata is already loaded when browsing the file tree.

## Formatting

### File Size

- Converted from bytes to kilobytes
- Formatted with 2 decimal places
- Example: `1024` bytes → `1.00 KB`

### Modified Date

- Uses browser's locale settings
- Shows full date and time
- Example: `2026-02-05T12:34:56.789Z` → `2/5/2026, 12:34:56 PM`

### Separator

- Uses bullet point (`•`) with dark gray color
- Provides visual separation between metadata items
- Consistent with other UI patterns in the app

## Edge Cases

### Missing Metadata

The code handles cases where metadata might not be available:

```javascript
{file.size && (
  // Only show size if it exists
)}

{file.modified && (
  // Only show modified date if it exists
)}
```

This ensures the UI doesn't break if:

- OpenClaw service doesn't return metadata
- File is newly created and metadata isn't available yet
- API response format changes

### Directory vs File

This enhancement only applies to files, not directories. Directories show a different view:

```javascript
if (file.type === 'directory') {
  return (
    <div>Directory: {file.name}</div>
  );
}
```

## Consistency

This change aligns with the overall permission model:

| Data Type | Regular User Access |
| --------- | ------------------- |
| **File name** | ✓ Visible |
| **File size** | ✓ Visible (new) |
| **Modified date** | ✓ Visible (new) |
| **File content** | ✗ Restricted |

Users can see **metadata** but not **content** - a clear, logical boundary.

## Technical Details

### No Performance Impact

- Metadata is already loaded from file listing
- No additional API calls required
- No additional state management needed
- Uses existing `file` object prop

### Conditional Rendering

- Uses `&&` operator for clean conditional rendering
- Gracefully handles missing metadata
- Maintains existing error handling

### Formatting Functions

- Uses `toLocaleString()` for locale-aware number formatting
- Uses `Date.toLocaleString()` for locale-aware date formatting
- Respects user's browser locale settings

## Testing

### Manual Testing Steps

1. **Login as regular user**
2. **Navigate to Workspace Files**
3. **Click on any file**
4. **Verify you see:**
   - File name
   - File size in KB (with 2 decimals)
   - Modified date and time
   - Lock icon
   - "Access restricted" text
   - Mosaic pattern background
   - Permission message

5. **Login as admin/owner**
6. **Click on same file**
7. **Verify you see:**
   - File name
   - File size and modified date (same format)
   - Full file content (not restricted)

### Edge Cases to Test

- [ ] File with no size metadata
- [ ] File with no modified date
- [ ] Very large file (>1GB)
- [ ] Very small file (<1KB)
- [ ] Recently modified file
- [ ] Old file (years ago)
- [ ] Directory (should not show metadata)

## Related Changes

This enhancement builds on:

1. **File Access Control** - Regular users can browse files
2. **User List Permissions** - Consistent metadata visibility pattern
3. **API Permissions** - File listing endpoint accessible to all users

## Future Enhancements

Potential improvements:

1. **File Type Icon**: Show different icons for different file types
2. **File Owner**: Show who created/owns the file
3. **File Permissions**: Show read/write permissions
4. **File Tags**: Show custom tags or labels
5. **File Preview**: Show thumbnail for images (if available in metadata)

## Files Modified

- `src/components/FilePreview.jsx` - Added metadata display to restricted view header

## Documentation

- No API changes required
- No backend changes required
- Frontend-only enhancement using existing data

# Workspace File Management Enhancements

## Overview

Enhanced the workspace file management system with two major features:

1. **Nested folder creation** - Create files with full paths (e.g., `docs/guides/setup.md`)
2. **Drag-and-drop file organization** - Move files between folders by dragging

## Feature 1: Nested Folder Creation

### What Changed

The "Create New File" modal now supports full path specifications, automatically creating any necessary parent folders.

### How to Use

When creating a new file, you can now specify:

- **Simple filename**: `README.md` (creates in current folder)
- **Nested path**: `docs/README.md` (creates `docs/` folder if needed, then creates the file)
- **Deep nesting**: `docs/guides/setup.md` (creates entire folder structure)

### Examples

```bash
# Current location: /
Input: docs/HEARTBEAT_RUNBOOK.md
Result: Creates /docs/ folder and /docs/HEARTBEAT_RUNBOOK.md file

# Current location: /src
Input: components/Button.jsx
Result: Creates /src/components/ folder and /src/components/Button.jsx file

# Current location: /
Input: api/v1/routes/users.js
Result: Creates /api/v1/routes/ folder structure and the file
```

### Validation Rules

- **No path traversal**: Cannot use `..` in paths
- **Valid characters**: Standard filename restrictions apply to all path segments
- **Must end with filename**: Path cannot end with `/`
- **Auto-normalization**: Multiple slashes (`//`) are automatically normalized to single slashes
- **No overwrites**: Cannot create a file/folder if one already exists at that location
- **Path conflict check**: Validates entire path to ensure no files exist where folders are needed

### UI Updates

- Label changed from "File Name" to "File Name or Path"
- Placeholder shows example: `example.txt or docs/README.md`
- Help text explains the feature: "Use / to create nested folders"
- Base location is clearly displayed

## Feature 2: Drag-and-Drop File Organization

### What Changed

Files can now be dragged and dropped between folders in the tree view to reorganize your workspace.

### How to Use

1. **Drag a file**: Click and hold on any file in the tree view
2. **Drop on a folder**: Drag to a folder and release to move the file
3. **Visual feedback**: Folders highlight when you hover over them during drag
4. **Confirmation**: If a file with the same name exists, you'll be prompted to confirm overwrite

### Features

- **Visual indicators**: 
  - Draggable items show a move cursor
  - Drop targets (folders) highlight with a blue ring when hovered
  - Spinner shows during the move operation

- **Safety checks**:
  - Cannot drop a folder into itself
  - Cannot drop into descendant folders
  - Confirms before overwriting existing files
  - Only available to admin users

- **Automatic refresh**: Both source and destination folders refresh after move

### Current Limitations

- **Files only**: Moving folders is not yet supported (requires recursive operations)
- **Same workspace**: Can only move within the same workspace
- **Admin only**: Requires admin/owner permissions

### Technical Details

The move operation is implemented as:
1. Read file content from source
2. Create file at destination
3. Delete file from source
4. Invalidate caches for both directories

## Implementation Details

### Files Modified

1. **CreateFileModal.jsx**
   - Enhanced validation to allow `/` in filenames
   - Added path parsing and normalization
   - Updated UI with better labels and help text

2. **WorkspaceTree.jsx**
   - Added drag-and-drop event handlers
   - Visual feedback for drag operations
   - Pass through drag handlers to child nodes

3. **WorkspaceExplorer.jsx**
   - Implemented drop handler logic
   - Safety checks and validation
   - Cache invalidation and refresh

4. **workspaceStore.js**
   - Added `moveFile` function
   - Handles read-create-delete sequence
   - Cache management for moved files

### API Endpoints Used

- `GET /openclaw/workspace/files/content` - Read file content
- `POST /openclaw/workspace/files` - Create file at new location
- `DELETE /openclaw/workspace/files` - Remove file from old location

### Future Enhancements

Potential improvements for future iterations:

1. **Backend move endpoint**: Add dedicated `MOVE /openclaw/workspace/files` endpoint for atomic operations
2. **Folder moving**: Support recursive folder moves
3. **Bulk operations**: Select and move multiple files at once
4. **Undo/redo**: Add operation history and undo capability
5. **Copy operation**: Add ability to copy (not just move) files
6. **Progress indicators**: Show progress for large file operations
7. **Keyboard shortcuts**: Add keyboard support for drag-and-drop (accessibility)

## Testing Checklist

### Nested Folder Creation

- [ ] Create file with simple name in root
- [ ] Create file with single nested folder (e.g., `docs/README.md`)
- [ ] Create file with deep nesting (e.g., `a/b/c/d/file.txt`)
- [ ] Verify folders are created automatically
- [ ] Test with existing folder structure
- [ ] Verify validation prevents `..` in paths
- [ ] Verify validation prevents invalid characters
- [ ] Test path normalization (multiple slashes)
- [ ] Verify success toast shows correct filename
- [ ] **Test duplicate prevention**: Try creating file that already exists
- [ ] **Test folder conflict**: Try creating file where folder exists
- [ ] **Test path conflict**: Try creating `a/b/file.txt` when `a/b` is a file

### Drag-and-Drop

- [ ] Drag file to folder in same directory
- [ ] Drag file to nested folder
- [ ] Drag file to root folder
- [ ] Verify visual feedback (cursor, highlight)
- [ ] Test overwrite confirmation
- [ ] Verify cannot drop folder into itself
- [ ] Verify folders refresh after move
- [ ] Test with non-admin user (should be disabled)
- [ ] Verify error handling for failed moves
- [ ] Test with files of different types (.md, .txt, .js, etc.)

## User Documentation

### For End Users

**Creating Nested Files:**

1. Click "New File" button
2. Enter path with folders: `folder1/folder2/filename.ext`
3. Click "Create File"
4. All folders will be created automatically

**Moving Files:**

1. Click and hold on a file
2. Drag to the destination folder
3. Release to drop
4. Confirm if prompted about overwriting

### For Developers

See the implementation in:
- `src/components/CreateFileModal.jsx` - File creation with paths
- `src/components/WorkspaceTree.jsx` - Drag-and-drop UI
- `src/components/WorkspaceExplorer.jsx` - Drop handler logic
- `src/stores/workspaceStore.js` - Move operation implementation

## Troubleshooting

### File Creation Issues

**Problem**: "File name cannot contain .."
- **Solution**: Remove `..` from your path. Use absolute paths from current location.

**Problem**: "Path must end with a filename"
- **Solution**: Ensure path doesn't end with `/`. Example: `docs/README.md` not `docs/`

**Problem**: "A file/folder named 'X' already exists at this location"
- **Solution**: Choose a different name or delete the existing file/folder first. The system prevents accidental overwrites during creation.

**Problem**: "Cannot create file: 'X' already exists as a file in the path"
- **Solution**: You're trying to create a path like `a/b/c.txt` but `a/b` is a file, not a folder. Rename or move the conflicting file first.

### Drag-and-Drop Issues

**Problem**: Cannot drag files
- **Solution**: Ensure you have admin/owner permissions

**Problem**: Drop doesn't work
- **Solution**: Only folders can be drop targets. Ensure you're dropping on a folder, not a file.

**Problem**: "Moving folders is not yet supported"
- **Solution**: Currently only files can be moved. Use create/delete for folders.

## Performance Considerations

- **Cache invalidation**: Both source and destination caches are cleared after move
- **Lazy loading**: Folders load children on-demand, not upfront
- **Optimistic UI**: Could be added in future for instant feedback
- **Batch operations**: Consider batching multiple moves in future

## Security Considerations

- **Path validation**: All paths are validated to prevent traversal attacks
- **Permission checks**: Only admin/owner can create/move files
- **No overwrites on create**: Creating files/folders is rejected if item already exists
- **Overwrite confirmation on move**: User must confirm before overwriting during drag-and-drop
- **Path conflict detection**: Checks entire path to prevent creating files where folders should be
- **Backend validation**: All operations validated on backend as well

## Related Documentation

- [React UI Components Rule](.cursor/rules/react-ui-components.mdc)
- [User Feedback Patterns](.cursor/rules/user-feedback.mdc)
- [State Management](.cursor/rules/state-management.mdc)
- [API Client](.cursor/rules/api-client.mdc)

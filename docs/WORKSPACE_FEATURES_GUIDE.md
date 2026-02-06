# Workspace Features - Visual Guide

## Feature 1: Create Files with Nested Paths

### Before Enhancement

**Old Behavior:**

- Could only create files in the current directory
- Had to manually create folders first, then navigate and create files
- Multi-step process for nested structures

```
Step 1: Click "New Folder" → Enter "docs" → Create
Step 2: Navigate to /docs
Step 3: Click "New File" → Enter "README.md" → Create
```

### After Enhancement

**New Behavior:**

- Create files with full paths in one step
- Folders are automatically created as needed
- Single operation for any depth of nesting

```
Step 1: Click "New File" → Enter "docs/README.md" → Create
✓ Done! Both folder and file created
```

### UI Changes

**Modal Title:** "Create New File"

**Old Label:**

```
File Name: [example.txt        ]
Location: /
```

**New Label:**

```
File Name or Path: [example.txt or docs/README.md]
Base location: /
Tip: Use / to create nested folders (e.g., docs/guides/setup.md)
```

### Examples

#### Example 1: Simple Nested File

```
Input:    docs/HEARTBEAT_RUNBOOK.md
Creates:  /docs/ (folder)
          /docs/HEARTBEAT_RUNBOOK.md (file)
```

#### Example 2: Deep Nesting

```
Input:    api/v1/routes/users.js
Creates:  /api/ (folder)
          /api/v1/ (folder)
          /api/v1/routes/ (folder)
          /api/v1/routes/users.js (file)
```

#### Example 3: Relative to Current Path

```
Current:  /src
Input:    components/Button.jsx
Creates:  /src/components/ (folder)
          /src/components/Button.jsx (file)
```

---

## Feature 2: Drag-and-Drop File Organization

### Visual States

#### State 1: Normal (No Drag)

```
📁 root
  📄 README.md
  📁 docs
    📄 guide.md
  📁 src
    📄 index.js
```

#### State 2: Dragging (File Selected)

```
📁 root
  📄 README.md [cursor: move]  ← Dragging this file
  📁 docs
    📄 guide.md
  📁 src [highlighted with blue ring]  ← Hovering over this folder
    📄 index.js
```

#### State 3: After Drop

```
📁 root
  📁 docs
    📄 guide.md
  📁 src
    📄 index.js
    📄 README.md  ← File moved here!
```

### Drag-and-Drop Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. START DRAG                                               │
│    • Click and hold on file                                 │
│    • Cursor changes to "move"                               │
│    • File becomes semi-transparent (browser default)        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. DRAG OVER FOLDER                                         │
│    • Folder highlights with blue ring                       │
│    • Drop effect shows "move"                               │
│    • Visual feedback: ring-2 ring-primary-500               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. DROP                                                     │
│    • Release mouse button                                   │
│    • Confirmation dialog if file exists                     │
│    • Loading spinner appears                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. COMPLETE                                                 │
│    • Success toast: "Moved 'filename' successfully"         │
│    • Both folders refresh automatically                     │
│    • File appears in new location                           │
└─────────────────────────────────────────────────────────────┘
```

### Visual Indicators

#### Draggable Item (File)

```css
cursor: move;
opacity: 0.5 (while dragging - browser default);
```

#### Drop Target (Folder - Hover)

```css
ring-2 ring-primary-500
bg-primary-600/10
```

#### Drop Target (Folder - Normal)

```css
hover:bg-dark-800
```

### Error States (Creation)

#### Error 1: File Already Exists

```
Trying to create: /docs/README.md
But it already exists!
  
❌ Toast: "A file named 'README.md' already exists at this location"
```

#### Error 2: Folder Already Exists

```
Trying to create folder: /docs
But it already exists!
  
❌ Toast: "A folder named 'docs' already exists at this location"
```

#### Error 3: Path Conflict (File Where Folder Needed)

```
Trying to create: /src/components/Button.jsx
But /src/components is a file, not a folder!
  
❌ Toast: "Cannot create file: 'components' already exists as a file in the path"
```

### Error States (Drag-and-Drop)

#### Error 1: Cannot Drop Folder into Itself

```
📁 src [dragging]
  📁 components [trying to drop here]
    
❌ Toast: "Cannot move a folder into itself"
```

#### Error 2: Moving Folders Not Supported

```
📁 docs [dragging]
  
❌ Toast: "Moving folders is not yet supported"
```

#### Error 3: File Already Exists (Move Operation)

```
📁 src
  📄 index.js [dragging]
  
📁 dist
  📄 index.js [already exists]
  
⚠️  Confirm: "A file named 'index.js' already exists. Overwrite?"
```

**Note**: This confirmation only appears during drag-and-drop moves. When creating new files/folders, duplicates are rejected outright without overwrite option.

---

## User Workflows

### Workflow 1: Create Documentation Structure

**Goal:** Create `docs/api/endpoints.md`

**Steps:**

1. Click "New File" button
2. Enter: `docs/api/endpoints.md`
3. Click "Create File"

**Result:**

```
📁 root
  📁 docs (created)
    📁 api (created)
      📄 endpoints.md (created)
```

### Workflow 2: Reorganize Project Files

**Goal:** Move all documentation files into a `docs/` folder

**Steps:**

1. Create `docs/` folder (if not exists)
2. Drag `README.md` → Drop on `docs/`
3. Drag `CHANGELOG.md` → Drop on `docs/`
4. Drag `LICENSE.md` → Drop on `docs/`

**Result:**

```
Before:                    After:
📁 root                    📁 root
  📄 README.md               📁 docs
  📄 CHANGELOG.md              📄 README.md
  📄 LICENSE.md                📄 CHANGELOG.md
  📁 src                       📄 LICENSE.md
                              📁 src
```

### Workflow 3: Create Multi-Level Structure

**Goal:** Create a complex project structure

**Steps:**

1. Create `src/components/Button.jsx`
2. Create `src/components/Input.jsx`
3. Create `src/utils/helpers.js`
4. Create `tests/components/Button.test.js`

**Result:**

```
📁 root
  📁 src
    📁 components
      📄 Button.jsx
      📄 Input.jsx
    📁 utils
      📄 helpers.js
  📁 tests
    📁 components
      📄 Button.test.js
```

---

## Keyboard & Mouse Reference

### Mouse Actions

| Action | Result |
|--------|--------|
| Click file | Select file (preview in right pane) |
| Right-click file | Open context menu |
| Click folder | Expand/collapse folder |
| Drag file | Start drag operation |
| Drag over folder | Highlight folder as drop target |
| Drop on folder | Move file to folder |

### Keyboard Shortcuts (Existing)

| Key | Action |
|-----|--------|
| Delete | Delete selected file |
| F2 | Rename selected file |

---

## Permission Matrix

| Action | User | Admin | Owner |
|--------|------|-------|-------|
| View files | ✅ | ✅ | ✅ |
| View file content | ❌ | ✅ | ✅ |
| Create file | ❌ | ✅ | ✅ |
| Create nested file | ❌ | ✅ | ✅ |
| Drag file | ❌ | ✅ | ✅ |
| Drop file | ❌ | ✅ | ✅ |
| Delete file | ❌ | ✅ | ✅ |
| Rename file | ❌ | ✅ | ✅ |

---

## Tips & Best Practices

### Creating Files

✅ **Do:**

- Use descriptive folder names: `docs/`, `src/`, `tests/`
- Follow project conventions for structure
- Use forward slashes `/` for paths
- Keep folder depth reasonable (2-4 levels)

❌ **Don't:**

- Use `..` in paths (security risk)
- End paths with `/` (must be a filename)
- Use invalid characters: `< > : " | ? *`
- Create extremely deep nesting (hard to navigate)

### Moving Files

✅ **Do:**

- Organize files into logical folders
- Use drag-and-drop for quick reorganization
- Confirm before overwriting files
- Check both source and destination after move

❌ **Don't:**

- Try to move folders (not yet supported)
- Drop files into themselves
- Move critical files without backup
- Drag files rapidly (wait for operation to complete)

---

## Troubleshooting

### Problem: "File name cannot contain .."

**Cause:** Path contains `..` which could be a security risk

**Solution:** Use absolute paths from current location

```
❌ ../docs/file.md
✅ docs/file.md
```

### Problem: "Path must end with a filename"

**Cause:** Path ends with `/` (folder path, not file path)

**Solution:** Add filename at the end

```
❌ docs/api/
✅ docs/api/endpoints.md
```

### Problem: "A file/folder named 'X' already exists"

**Cause:** Trying to create a file or folder that already exists

**Solution:**

- Choose a different name
- Delete the existing file/folder first
- Check if you meant to edit the existing file instead

### Problem: "Cannot create file: 'X' already exists as a file in the path"

**Cause:** Path segment is a file when it should be a folder

**Example:**

```
Existing: /src/components (this is a FILE)
Trying:   /src/components/Button.jsx (needs components to be a FOLDER)
```

**Solution:**

- Rename or delete the conflicting file
- Choose a different path structure

### Problem: Drag-and-drop doesn't work

**Cause:** Insufficient permissions or dragging unsupported item

**Solution:**

- Check you have admin/owner role
- Ensure you're dragging a file (not a folder)
- Ensure you're dropping on a folder (not a file)

### Problem: File appears in wrong location

**Cause:** Dropped on wrong folder or folder was collapsed

**Solution:**

- Expand destination folder to verify
- Use refresh button to reload view
- Check current path in breadcrumbs

---

## Browser Compatibility

| Browser | Nested Paths | Drag-and-Drop |
|---------|--------------|---------------|
| Chrome 90+ | ✅ | ✅ |
| Firefox 88+ | ✅ | ✅ |
| Safari 14+ | ✅ | ✅ |
| Edge 90+ | ✅ | ✅ |

**Note:** Drag-and-drop uses HTML5 Drag and Drop API, supported in all modern browsers.

---

## Accessibility

### Keyboard Navigation

- **Tab**: Navigate between UI elements
- **Enter**: Activate buttons and expand folders
- **Escape**: Close modals
- **Delete**: Delete selected file (with confirmation)
- **F2**: Rename selected file

### Screen Reader Support

- All interactive elements have proper ARIA labels
- Drag-and-drop operations announce state changes
- Error messages are announced to screen readers
- Success toasts are announced

### Future Improvements

- Add keyboard-based drag-and-drop (for accessibility)
- Add more keyboard shortcuts for common operations
- Improve focus management in tree view
- Add skip links for navigation

---

## Performance Notes

### Caching Strategy

- **Listings cached** by path and recursive flag
- **File content cached** by path
- **Cache invalidated** after create/move/delete operations
- **Lazy loading** for folder contents (on-demand)

### Optimization Tips

- Use tree view for better performance with many files
- Collapse unused folders to reduce DOM nodes
- Use search/filter to narrow down visible files
- Refresh only when needed (cache is used by default)

---

## Related Documentation

- [Technical Documentation](./WORKSPACE_ENHANCEMENTS.md)
- [Quick Reference Card](./WORKSPACE_QUICK_REFERENCE.md)
- [Security Fix Details](./WORKSPACE_SECURITY_FIX.md)
- [Backend Security Architecture](../../mosbot-api/docs/implementations/openclaw-workspace/WORKSPACE_SECURITY_ARCHITECTURE.md)

## Related Features

### Context Menu

Right-click on files/folders for quick actions:

- New File (in folder)
- New Folder (in folder)
- Rename (files only)
- Delete
- View

### Search/Filter

Use the search box to filter visible files:

- Case-insensitive search
- Matches file/folder names
- Works in both tree and flat views

### View Modes

- **Tree View**: Hierarchical, expandable folders
- **Flat View**: Single-level list with breadcrumbs

---

## Future Roadmap

### Planned Features

1. **Folder drag-and-drop**: Move entire folders recursively
2. **Copy operation**: Duplicate files/folders
3. **Bulk operations**: Select and move multiple files
4. **Undo/redo**: Revert recent operations
5. **File preview**: Quick preview without opening
6. **Keyboard shortcuts**: More shortcuts for power users
7. **Breadcrumb navigation**: Click path segments to navigate

### Backend Improvements

1. **Atomic move endpoint**: Single API call for moves
2. **Batch operations**: Move multiple files in one request
3. **Transaction support**: Rollback on failure
4. **File locking**: Prevent concurrent modifications
5. **Version history**: Track file changes over time

---

## Support

For issues or questions:

- Check this guide first
- Review error messages carefully
- Check browser console for technical details
- Contact system administrator for permission issues

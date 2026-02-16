# Docs Page Auto-Refresh Fix

## Problem

The `/docs` page did not have the same UX as the `/workspaces/:agentId` pages. When creating, editing, renaming, or deleting files/folders in the docs page, the file list did not automatically refresh to show the changes.

## Root Cause

The issue was that the modals (`CreateFileModal`, `CreateFolderModal`, `RenameModal`, `DeleteConfirmModal`) were not receiving the `agentId` prop from the `WorkspaceExplorer` component. 

When these modals called workspace store methods like `createFile`, `deleteFile`, and `fetchListing`, they were defaulting to `agentId = 'coo'` instead of using the correct `agentId = 'docs'` for the docs page.

This caused the cache keys to be incorrect:
- Expected cache key: `docs:/path:false`
- Actual cache key: `coo:/path:false`

As a result, the UI was not updating after mutations because the wrong cache was being invalidated.

## Solution

### 1. Pass `agentId` to Modals

Updated `WorkspaceExplorer.jsx` to pass the `agentId` prop to all modals:

```jsx
<CreateFileModal
  isOpen={showCreateFileModal}
  onClose={() => setShowCreateFileModal(false)}
  currentPath={modalTargetPath}
  agentId={agentId}  // ← Added
/>

<CreateFolderModal
  isOpen={showCreateFolderModal}
  onClose={() => setShowCreateFolderModal(false)}
  currentPath={modalTargetPath}
  agentId={agentId}  // ← Added
/>

<RenameModal
  isOpen={showRenameModal}
  onClose={() => setShowRenameModal(false)}
  file={modalTargetFile}
  agentId={agentId}  // ← Added
/>

<DeleteConfirmModal
  isOpen={showDeleteModal}
  onClose={() => setShowDeleteModal(false)}
  file={modalTargetFile}
  agentId={agentId}  // ← Added
/>
```

### 2. Update Modal Components

Updated each modal to:
1. Accept the `agentId` prop with a default value of `'coo'` for backward compatibility
2. Pass `agentId` to all workspace store method calls

#### CreateFileModal.jsx

```jsx
export default function CreateFileModal({ isOpen, onClose, currentPath, agentId = 'coo' }) {
  // ...
  
  // Use agentId in cache key lookups
  const cacheKey = `${agentId}:${parentPath}:false`;
  
  // Pass agentId to store methods
  await fetchListing({ path: parentPath, recursive: false, agentId });
  await createFile({ path: filePath, content: '', agentId });
  await fetchListing({ path: parentPath, recursive: false, force: true, agentId });
}
```

#### CreateFolderModal.jsx

```jsx
export default function CreateFolderModal({ isOpen, onClose, currentPath, agentId = 'coo' }) {
  // ...
  
  // Use agentId in cache key lookups
  const cacheKey = `${agentId}:${currentPath}:false`;
  
  // Pass agentId to store methods
  await fetchListing({ path: currentPath, recursive: false, agentId });
  await createDirectory({ path: folderPath, agentId });
  await fetchListing({ path: currentPath, recursive: false, force: true, agentId });
}
```

#### RenameModal.jsx

```jsx
export default function RenameModal({ isOpen, onClose, file, agentId = 'coo' }) {
  // ...
  
  // Pass agentId to store methods
  const fileContent = await fetchFileContent({ path: file.path, agentId });
  await createFile({ 
    path: newPath, 
    content: fileContent.content,
    encoding: fileContent.encoding || 'utf8',
    agentId
  });
  await deleteFile({ path: file.path, agentId });
  await fetchListing({ path: oldParentPath, recursive: false, force: true, agentId });
}
```

#### DeleteConfirmModal.jsx

```jsx
export default function DeleteConfirmModal({ isOpen, onClose, file, agentId = 'coo' }) {
  // ...
  
  // Pass agentId to store methods
  await deleteFile({ path: file.path, agentId });
  await fetchListing({ path: parentPath, recursive: false, force: true, agentId });
}
```

## Testing

To verify the fix:

1. Navigate to `/docs`
2. Create a new file or folder
3. Verify the file list automatically refreshes to show the new item
4. Rename or delete a file/folder
5. Verify the file list automatically updates

The same behavior should now work consistently across both `/docs` and `/workspaces/:agentId` pages.

## Files Changed

- `src/components/WorkspaceExplorer.jsx` - Pass `agentId` to modals
- `src/components/CreateFileModal.jsx` - Accept and use `agentId` prop
- `src/components/CreateFolderModal.jsx` - Accept and use `agentId` prop
- `src/components/RenameModal.jsx` - Accept and use `agentId` prop
- `src/components/DeleteConfirmModal.jsx` - Accept and use `agentId` prop

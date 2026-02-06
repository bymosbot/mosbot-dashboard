# Workspace Quick Reference Card

## 🚀 Quick Start

### Create a File with Nested Folders

```
1. Click "New File"
2. Type: docs/guides/setup.md
3. Click "Create File"
✓ All folders created automatically!
```

### Move a File to Another Folder

```
1. Click and hold on the file
2. Drag to destination folder
3. Release to drop
✓ File moved!
```

---

## 📝 Creating Files

### Simple File

```
Input:  README.md
Result: /README.md
```

### Nested File (1 level)

```
Input:  docs/README.md
Result: /docs/README.md
```

### Deep Nesting

```
Input:  src/components/Button.jsx
Result: /src/components/Button.jsx
```

### From Subfolder

```
Current: /src
Input:   utils/helpers.js
Result:  /src/utils/helpers.js
```

---

## 🎯 Drag-and-Drop

### Visual Cues

- **Dragging**: Cursor changes to "move"
- **Valid drop**: Folder highlights with blue ring
- **Invalid drop**: No highlight

### What You Can Do

✅ Drag files to folders  
✅ Move files between folders  
✅ Overwrite with confirmation  

### What You Cannot Do

❌ Drag folders (not yet supported)  
❌ Drop folder into itself  
❌ Drag without admin permissions  

---

## ⚠️ Common Errors

| Error | Fix |
|-------|-----|
| "File name cannot contain .." | Remove `..` from path |
| "Path must end with a filename" | Don't end with `/` |
| "A file/folder named 'X' already exists" | Choose different name or delete existing |
| "Cannot create file: 'X' already exists as a file" | Path conflict - rename conflicting file |
| "Moving folders is not yet supported" | Only files can be moved |
| "Cannot move a folder into itself" | Choose different destination |

---

## 🔑 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Delete | Delete selected file |
| F2 | Rename selected file |
| Escape | Close modal |

---

## 👥 Permissions

| Action | User | Admin/Owner |
|--------|------|-------------|
| View files | ✅ | ✅ |
| Create files | ❌ | ✅ |
| Move files | ❌ | ✅ |
| Delete files | ❌ | ✅ |

---

## 💡 Pro Tips

1. **Batch Create**: Use nested paths to create multiple folders at once

   ```
   api/v1/routes/users.js
   api/v1/routes/posts.js
   api/v1/routes/comments.js
   ```

2. **Quick Reorganize**: Drag multiple files one by one to reorganize quickly

3. **Check Before Overwrite**: Always confirm when prompted about existing files

4. **Use Search**: Filter files before dragging to find them faster

5. **Expand Folders**: Expand destination folder to see where file will land

---

## 🎨 Visual States

### Normal File

```
📄 filename.txt
```

### Dragging File

```
📄 filename.txt [cursor: move, semi-transparent]
```

### Drop Target (Folder)

```
📁 folder [blue ring highlight]
```

### After Drop

```
📁 folder
  📄 filename.txt [newly moved]
```

---

## 🔍 Validation Rules

### File Names

- ✅ Letters, numbers, dots, dashes, underscores
- ✅ Spaces (but not recommended)
- ❌ `< > : " | ? *` (invalid characters)
- ❌ `..` (path traversal)
- ❌ Names that already exist (no overwrites)

### Paths

- ✅ Use `/` to separate folders
- ✅ Any depth: `a/b/c/d/file.txt`
- ❌ Cannot end with `/`
- ❌ No `..` sequences
- ❌ Cannot create if file/folder already exists
- ❌ Cannot use file name as folder in path

---

## 📊 Examples by Use Case

### Documentation Structure

```
docs/README.md
docs/api/endpoints.md
docs/guides/setup.md
docs/guides/deployment.md
```

### Source Code Structure

```
src/index.js
src/components/Button.jsx
src/components/Input.jsx
src/utils/helpers.js
src/utils/constants.js
```

### Test Structure

```
tests/unit/helpers.test.js
tests/integration/api.test.js
tests/e2e/login.test.js
```

---

## 🛠️ Troubleshooting

### File Not Appearing After Creation

1. Click refresh button (↻)
2. Check current path in breadcrumbs
3. Expand parent folders

### Drag-and-Drop Not Working

1. Verify you have admin/owner role
2. Ensure dragging a file (not folder)
3. Ensure dropping on folder (not file)
4. Try refreshing the page

### File Already Exists Error

1. Choose different name
2. Or confirm overwrite when prompted
3. Or delete existing file first

---

## 📱 Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Nested paths | ✅ | ✅ | ✅ | ✅ |
| Drag-and-drop | ✅ | ✅ | ✅ | ✅ |

Requires modern browser (2020+)

---

## 🎓 Learning Path

### Beginner

1. Create simple files
2. Create files in existing folders
3. Use search to find files

### Intermediate

4. Create nested folder structures
2. Drag files between folders
3. Use context menu for operations

### Advanced

7. Organize complex project structures
2. Use keyboard shortcuts
3. Batch operations with multiple files

---

## 📞 Getting Help

1. **Check this guide** for common issues
2. **Read error messages** carefully
3. **Try refresh** if something seems wrong
4. **Contact admin** for permission issues
5. **Check browser console** for technical details

---

## 🔄 Related Features

- **Context Menu**: Right-click for quick actions
- **Search**: Filter files by name
- **View Modes**: Tree vs Flat view
- **File Preview**: Click to preview content
- **Breadcrumbs**: Navigate folder hierarchy

---

## 📈 Best Practices

### Naming Conventions

```
✅ kebab-case: my-component.jsx
✅ camelCase: myComponent.jsx
✅ PascalCase: MyComponent.jsx
✅ snake_case: my_component.jsx
```

### Folder Organization

```
✅ Group by feature: /user/profile.js
✅ Group by type: /components/Button.jsx
✅ Keep depth reasonable: 2-4 levels
❌ Avoid deep nesting: /a/b/c/d/e/f/file.js
```

### File Naming

```
✅ Descriptive: user-profile.jsx
✅ Consistent: all lowercase or all PascalCase
❌ Vague: file1.js, temp.js, new.js
❌ Mixed: SomeFile.js, other_file.js
```

---

## 🎯 Common Workflows

### 1. Create Project Structure

```
src/index.js
src/components/App.jsx
src/components/Header.jsx
src/utils/api.js
tests/app.test.js
```

### 2. Organize Documentation

```
docs/README.md
docs/api/overview.md
docs/api/endpoints.md
docs/guides/quickstart.md
```

### 3. Reorganize Files

```
Drag README.md → docs/
Drag CHANGELOG.md → docs/
Drag LICENSE → docs/
```

---

## ⏱️ Time Savers

| Task | Old Way | New Way | Time Saved |
|------|---------|---------|------------|
| Create nested file | 3 steps | 1 step | 60% |
| Move file | Copy+Paste+Delete | Drag+Drop | 70% |
| Create structure | Manual folders | Path creation | 80% |

---

## 🔐 Security Notes

- Paths are validated server-side
- `..` sequences are blocked
- Invalid characters are rejected
- Admin permissions required for modifications
- **No overwrites on create** - existing files/folders are protected
- Overwrite confirmation required for move operations only

---

## 📚 Further Reading

- [Full Feature Documentation](./WORKSPACE_ENHANCEMENTS.md)
- [Visual Guide](./WORKSPACE_FEATURES_GUIDE.md)
- [Security Fix Documentation](./WORKSPACE_SECURITY_FIX.md)
- [API Documentation](../../mosbot-api/docs/api/openclaw-public-api.md)
- [Backend Security Architecture](../../mosbot-api/docs/implementations/openclaw-workspace/WORKSPACE_SECURITY_ARCHITECTURE.md)

---

**Last Updated:** 2026-02-06  
**Version:** 1.0.0

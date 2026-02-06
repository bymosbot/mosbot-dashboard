# Comment History Display

## Overview

Task history now properly displays comment-related events with custom icons, colors, and labels instead of showing generic "Updated" entries.

## History Event Types

### Comment Created

- **Label**: "Comment added"
- **Icon**: Chat bubble (ChatBubbleLeftRightIcon)
- **Color**: Cyan (bg-cyan-500/10 text-cyan-400 border-cyan-500/20)
- **Display**: Shows the full comment content (or preview if >150 chars)

**Example:**

```bash
[💬] Comment added
    by John Doe
    06/02/2026, 5:49:26 pm
    
    Comment: "This is a new comment on the task"
```

### Comment Edited

- **Label**: "Comment edited"
- **Icon**: Pencil (PencilIcon)
- **Color**: Amber (bg-amber-500/10 text-amber-400 border-amber-500/20)
- **Display**: Shows old and new comment content side-by-side or stacked

**Example:**

```bash
[✏️] Comment edited
    by Jane Smith
    06/02/2026, 5:50:15 pm
    
    Comment
    OLD: "This is a comment"
    NEW: "This is an edited comment"
```

### Comment Deleted

- **Label**: "Comment deleted"
- **Icon**: Trash (TrashIcon)
- **Color**: Red (bg-red-500/10 text-red-400 border-red-500/20)
- **Display**: Shows the deleted comment content

**Example:**

```bash
[🗑️] Comment deleted
    by Admin User
    06/02/2026, 5:51:00 pm
    
    Comment
    OLD: "This comment was removed"
    NEW: (deleted)
```

## Implementation Details

### Detection Logic

Comment events are detected by checking the `event_type` field in the task log entry:

- `event_type === 'COMMENT_CREATED'` → Comment added
- `event_type === 'COMMENT_UPDATED'` → Comment edited
- `event_type === 'COMMENT_DELETED'` → Comment deleted

### Comment Content Display

**Preview for Long Comments:**

- Comments longer than 150 characters are truncated with "..." ellipsis
- This keeps the history view clean and scannable

**Special Values:**

- `null` or `undefined` in old value → "(new)" - indicates comment was just created
- `null` or `undefined` in new value → "(deleted)" - indicates comment was deleted
- Empty string → "(empty)"

**Example:**

```javascript
// Long comment (>150 chars)
"This is a very long comment that goes on and on with lots of details about the task and various considerations that need to be taken into account when implementing this feature..."

// Displayed as:
"This is a very long comment that goes on and on with lots of details about the task and various considerations that need to be taken into account wh..."
```

### History Entry Format

Each comment event in the history shows:

1. **Icon** - Visual indicator of the action type
2. **Label** - Human-readable action name
3. **Actor** - Who performed the action
4. **Timestamp** - When the action occurred
5. **Content** - The comment text (old/new for edits)

### Code Structure

**Key Functions:**

```javascript
// Detect comment events and return appropriate icon
getEventIcon(eventType, meta)

// Detect comment events and return appropriate color
getEventColor(eventType, meta)

// Detect comment events and return appropriate label
getEventLabel(eventType, meta)

// Format history entry with special handling for comments
formatHistoryEntry(entry)

// Format comment body with preview truncation
formatValue(value, isLongText, fieldKey)
```

## User Experience Benefits

1. **Clear Visual Distinction**: Comment events stand out from task field changes
2. **Scannable History**: Icons and colors make it easy to spot comment activity
3. **Context Preservation**: Shows what was said even after deletion
4. **Audit Trail**: Full record of who said what and when

## Future Enhancements

Potential improvements:

- [ ] Click to expand full comment text in history
- [ ] Markdown rendering in history view
- [ ] Link to jump to comment (if not deleted)
- [ ] Diff view for edited comments
- [ ] Filter history to show only comment events

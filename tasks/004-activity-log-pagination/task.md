# Task: Activity Log Pagination UI

**Task ID**: 004
**Priority**: Low (🟢)
**Estimated Effort**: Medium
**Related to**: Task 002 (Activity Log and UI Enhancements)

---

## Repository Context

The Activity Log page (`src/pages/Log.jsx`) currently fetches activity logs with a default limit of 100 items. With large datasets, this could impact performance and user experience. This task adds pagination UI to handle large datasets better.

### Current State

**Activity Log Page** (`src/pages/Log.jsx`):

- Fetches logs with `limit=100` parameter
- No pagination UI implemented
- All logs displayed in a single scrollable list
- Loading state implemented

**Activity Store** (`src/stores/activityStore.js`):

- `fetchActivity` accepts `limit` and `offset` parameters
- Backend API supports pagination via query parameters
- Store manages loading and error states

### Design Considerations

1. **Pagination Style**:
   - Option A: Traditional page numbers (1, 2, 3, ...)
   - Option B: Load More button
   - Option C: Infinite scroll
   - **Recommendation**: Load More button (simpler, better UX for logs)

2. **Page Size**:
   - Current: 100 items
   - **Recommendation**: 50 items per page (faster initial load)

3. **UI Placement**:
   - Bottom of log list
   - Show "Load More" button when more items available
   - Show loading spinner while fetching

---

## Task List

- [x] 1.0 Update Activity Store for pagination
  - [x] 1.1 Add `hasMore` state to track if more logs available
  - [x] 1.2 Add `currentOffset` state to track pagination position
  - [x] 1.3 Update `fetchActivity` to set hasMore based on pagination response
  - [x] 1.4 Add `loadMoreActivity` method to fetch next page and append logs
  - [x] 1.5 Add `isLoadingMore` state to track pagination loading
  - [x] 1.6 Add `pageSize` state (default 50)
  - [x] 1.7 Replace console.error with logger.error for consistency

- [x] 2.0 Update Log page UI for pagination
  - [x] 2.1 Add "Load More" button at bottom of log list
  - [x] 2.2 Show loading spinner on "Load More" button when fetching
  - [x] 2.3 Hide "Load More" button when no more logs available or loading initial data
  - [x] 2.4 Update initial fetch to use page size of 50 instead of 100
  - [x] 2.5 Add handleLoadMore function to trigger pagination

- [x] 3.0 Add tests for pagination
  - [x] 3.1 Add activityStore tests for `loadMoreActivity` method (5 new tests)
  - [x] 3.2 Add activityStore tests for `hasMore` state management
  - [x] 3.3 Add tests for preventing duplicate loads (isLoadingMore, !hasMore)
  - [x] 3.4 Update existing tests to account for new default page size (50)

- [x] 4.0 Run tests and linting to verify changes
  - [x] 4.1 Run `npm run lint` to verify no errors — Passed
  - [x] 4.2 Run `npm run test:run` to verify all tests pass — 18/18 activityStore tests passing

---

## Discovered Issues

This section tracks issues discovered during implementation that are outside the current scope and should NOT be fixed in this task (to avoid scope creep).

---

## Summary of Changes

This task implemented pagination UI for the Activity Log page to handle large datasets better. The implementation uses a "Load More" button pattern with a page size of 50 items, improving initial load performance and user experience.

### Key Improvements

- **Pagination Support**: Added `loadMoreActivity` method to fetch and append additional logs
- **State Management**: Added `hasMore`, `currentOffset`, `isLoadingMore`, and `pageSize` states to activityStore
- **Improved Performance**: Reduced initial page size from 100 to 50 items for faster initial load
- **Better UX**: "Load More" button with loading spinner provides clear feedback during pagination
- **Smart Loading**: Prevents duplicate loads when already loading or no more data available
- **Consistent Logging**: Replaced console.error with logger.error throughout activityStore

### File Changes

**Modified**:

- `src/stores/activityStore.js` - Added pagination state and `loadMoreActivity` method, updated `fetchActivity` to track `hasMore` state, replaced console.error with logger.error
- `src/pages/Log.jsx` - Added "Load More" button with loading state, updated initial fetch to use page size of 50, added `handleLoadMore` function
- `src/stores/activityStore.test.js` - Added 5 new tests for pagination functionality (18 total tests, all passing)
- `tasks/004-activity-log-pagination/task.md` - Updated task progress and summary

### Test Coverage

- **Total Tests**: 68 tests passing (6 toastStore + 10 authStore + 20 workspaceStore + 18 activityStore + 9 Log + 5 Login)
- **New Tests**: 5 pagination tests added to activityStore
  - Load more logs and append to existing
  - Set hasMore to false when all logs loaded
  - Prevent loading when already loading
  - Prevent loading when no more data
  - Handle API errors correctly

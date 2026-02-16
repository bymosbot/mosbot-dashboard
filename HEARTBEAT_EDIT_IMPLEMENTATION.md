# Heartbeat Configuration Editing Implementation

## Overview

This document describes the implementation that makes heartbeat configurations editable in the MosBot Dashboard.

## Changes Made

### Frontend Changes (mosbot-dashboard)

#### 1. `src/pages/CronJobs.jsx`

**Made heartbeat jobs editable:**
- Removed the read-only restriction for heartbeat jobs
- Changed `isEditable` from `job.source !== 'config'` to `true` (all jobs are now editable)
- Updated the badge from "READ-ONLY" to "CONFIG" for heartbeat jobs (pink badge)
- Hide Enable/Disable and Delete buttons for heartbeat jobs (config-based jobs cannot be deleted or toggled)
- Show only Edit button for heartbeat jobs

**Added heartbeat-specific form fields:**
- Added `target` field (default: 'last') - which session to target for heartbeat checks
- Added `ackMaxChars` field (default: '200') - maximum characters for heartbeat acknowledgment

**Updated form initialization:**
- Parse heartbeat schedule from `schedule.label` format (e.g., "30m", "1h")
- Load heartbeat-specific fields from `job.payload` (target, ackMaxChars, session, prompt)

**Updated form submission:**
- Include heartbeat-specific fields in payload when editing heartbeat jobs
- Set `payload.kind = 'heartbeat'` for heartbeat jobs
- Map `sessionTarget` to both `payload.session` and `sessionTarget` for compatibility

**Added heartbeat configuration section in modal:**
- New section titled "Heartbeat Configuration" that appears only when editing heartbeat jobs
- Target dropdown: "Last (most recent session)" or "Main (primary session)"
- Acknowledgment Max Chars input: numeric field with min=1, max=1000

### Backend Changes (mosbot-api)

#### 1. `src/services/cronJobsService.js`

**Added new functions:**

- `updateHeartbeatConfig(agentId, heartbeatConfig)`: Updates heartbeat configuration in OpenClaw config
  - Reads `/openclaw.json` from workspace
  - Finds the agent by ID
  - Merges heartbeat config
  - Writes back to OpenClaw config
  - Triggers `config.reload` tool (best-effort)

- `updateHeartbeatJob(jobId, payload)`: Wrapper function that updates heartbeat jobs
  - Extracts agent ID from job ID (format: `heartbeat-{agentId}`)
  - Builds heartbeat config from payload
  - Handles schedule conversion (every/cron)
  - Maps payload fields to heartbeat config fields
  - Returns job-like structure for consistency

**Exported new functions:**
- `updateHeartbeatJob`
- `updateHeartbeatConfig`

#### 2. `src/routes/openclaw.js`

**Updated PUT `/api/v1/openclaw/cron-jobs/:jobId`:**
- Check if job ID starts with `heartbeat-` to identify heartbeat jobs
- Route to `updateHeartbeatJob()` for heartbeat jobs
- Route to `updateCronJob()` for gateway jobs

**Updated PATCH `/api/v1/openclaw/cron-jobs/:jobId/enabled`:**
- Reject requests for heartbeat jobs with error message
- Heartbeat jobs cannot be enabled/disabled separately (must edit config)

**Updated DELETE `/api/v1/openclaw/cron-jobs/:jobId`:**
- Reject requests for heartbeat jobs with error message
- Heartbeat jobs cannot be deleted (they're defined in OpenClaw config)

## Heartbeat Configuration Parameters

Based on the OpenClaw config, heartbeat jobs support the following parameters:

```json
{
  "heartbeat": {
    "every": "30m",                    // Schedule (e.g., "30m", "1h", "45m")
    "model": "openrouter/...",         // AI model to use
    "session": "main",                 // Session type: "main" or "last"
    "target": "last",                  // Target session: "last" or "main"
    "prompt": "...",                   // Heartbeat prompt/message
    "ackMaxChars": 200                 // Max chars for acknowledgment
  }
}
```

## User Experience

### Viewing Heartbeat Jobs
- Heartbeat jobs display with a pink "CONFIG" badge
- Only the Edit button is shown (no Enable/Disable or Delete buttons)
- All heartbeat details are visible in the job card

### Editing Heartbeat Jobs
1. Click the Edit button on a heartbeat job
2. Modal opens with all fields populated
3. Edit any of the following:
   - Name (display name)
   - Description
   - Schedule (interval-based, e.g., "Every 30 minutes")
   - Prompt/Message
   - Agent (which agent runs the heartbeat)
   - AI Model (override agent's default model)
   - Session (main or isolated)
   - Delivery mode (announce or none)
   - **Target** (last or main) - Heartbeat-specific
   - **Acknowledgment Max Chars** - Heartbeat-specific
4. Click "Update" to save changes
5. Changes are written to OpenClaw config (`/openclaw.json`)
6. OpenClaw config reload is triggered (best-effort)

### Limitations
- Heartbeat jobs cannot be deleted (they're part of the agent configuration)
- Heartbeat jobs cannot be enabled/disabled separately (edit the config to remove/add them)
- Changes require OpenClaw to reload the config (automatic via `config.reload` tool)

## Testing

To test the implementation:

1. Navigate to the Scheduler page in MosBot Dashboard
2. Find a heartbeat job (e.g., "MosBot Heartbeat" for COO agent)
3. Click the Edit button
4. Modify any fields (e.g., change interval from 30m to 45m)
5. Click "Update"
6. Verify the changes are reflected in the UI
7. Check OpenClaw config to confirm changes were written

## Error Handling

- Frontend shows toast notifications for success/error
- Backend returns appropriate error messages:
  - 400: Invalid heartbeat job ID
  - 404: Agent not found or OpenClaw config not found
  - 500: Invalid OpenClaw config structure
- Config reload failures are logged but don't fail the update operation

## Bug Fixes

### Issue: "Invalid OpenClaw config structure" when updating heartbeat model

**Root Cause**: The OpenClaw config structure changed from `agents: [...]` to `agents: { list: [...] }`, but the update function was only checking for the old format.

**Fix**: Updated `updateHeartbeatConfig()` to handle both formats:
- New format: `config.agents.list` (current OpenClaw structure)
- Old format: `config.agents` (legacy structure)

This ensures backward compatibility with both old and new OpenClaw configurations.

**Files Modified**:
- `mosbot-api/src/services/cronJobsService.js`: Added format detection logic
- `mosbot-api/src/routes/openclaw.js`: Enhanced GET endpoint to include all heartbeat fields in payload

## Future Enhancements

Potential improvements:
- Add validation for heartbeat prompt (required field)
- Add preview of heartbeat schedule in human-readable format
- Add ability to test heartbeat configuration before saving
- Add ability to view heartbeat execution history
- Add ability to manually trigger a heartbeat

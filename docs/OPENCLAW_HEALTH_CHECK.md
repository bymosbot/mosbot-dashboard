# OpenClaw Health Check Integration

## Overview

The MosBot dashboard now monitors OpenClaw's health status in real-time and displays it in the BotAvatar component.

## How It Works

### 1. Health Check Endpoint

The dashboard calls the MosBot API endpoint:

```bash
GET /api/v1/openclaw/workspace/status
```

This endpoint proxies to the OpenClaw workspace service's `/status` endpoint, which returns:

```json
{
  "data": {
    "workspace": "/workspace",
    "exists": true,
    "accessible": true,
    "modified": "2026-02-05T12:00:00.000Z"
  }
}
```

### 2. Bot Store Integration

The `botStore` now includes:

- **`checkOpenClawHealth()`** - Async function that checks workspace status
- **`startHealthChecks()`** - Starts periodic health checks (every 30 seconds)
- **`stopHealthChecks()`** - Stops health checks
- **`isConnected`** - Boolean state updated by health checks

### 3. BotAvatar Component

The `BotAvatar` component:

1. **Starts health checks on mount** - Automatically begins monitoring OpenClaw
2. **Updates visual status** - Shows green (online), yellow (working), or red (offline)
3. **Displays status text** - Shows "Online", "Offline", or task count
4. **Animates based on status** - Different animations for each state

### 4. Visual Indicators

| Status | Border Color | Animation | Status Text |
| -------- | ------------- | ----------- | ------------- |
| **Online (Idle)** | Green | Floating/breathing | "Online" |
| **Working** | Yellow | Static with typing hands | "X tasks active" |
| **Offline** | Red | Sleeping/snoring | "Offline" |

## Implementation Details

### Health Check Flow

```bash
BotAvatar (mount)
    ↓
startHealthChecks()
    ↓
checkOpenClawHealth() ← Every 30 seconds
    ↓
GET /api/v1/openclaw/workspace/status
    ↓
Update isConnected state
    ↓
BotAvatar re-renders with new status
```

### Error Handling

- **Network errors**: Sets `isConnected = false`, shows offline status
- **API errors**: Logs warning to console, sets offline status
- **Graceful degradation**: Dashboard continues to work even if OpenClaw is offline

### Performance

- **Check interval**: 30 seconds (configurable in `botStore.js`)
- **Lightweight**: Only checks status endpoint, no heavy operations
- **Cleanup**: Stops health checks when component unmounts

## Configuration

### Adjust Health Check Interval

Edit `src/stores/botStore.js`:

```javascript
// Check every 30 seconds (default)
const interval = setInterval(() => {
  get().checkOpenClawHealth();
}, 30000); // Change this value (in milliseconds)
```

### Disable Health Checks

Remove or comment out the health check effect in `BotAvatar.jsx`:

```javascript
// useEffect(() => {
//   startHealthChecks();
//   return () => stopHealthChecks();
// }, [startHealthChecks, stopHealthChecks]);
```

## Testing

### Test Online Status

1. Ensure OpenClaw is running
2. Open MosBot dashboard
3. BotAvatar should show green border and "Online"

### Test Offline Status

1. Stop OpenClaw pod: `kubectl delete pod -l app=openclaw -n openclaw-personal`
2. Wait 30 seconds for next health check
3. BotAvatar should show red border and "Offline"

### Test Recovery

1. OpenClaw pod restarts automatically
2. Wait 30 seconds for next health check
3. BotAvatar should return to green "Online" status

## Future Enhancements

### Phase 2: WebSocket Connection

Replace polling with WebSocket for real-time updates:

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://mosbot-api/ws/openclaw/status');

ws.onmessage = (event) => {
  const { status } = JSON.parse(event.data);
  set({ isConnected: status === 'online' });
};
```

### Phase 3: Detailed Status

Show more detailed OpenClaw information:

- Current task being worked on
- Workspace file count
- Last activity timestamp
- Agent version

### Phase 4: Manual Reconnect

Add a button to manually trigger reconnection:

```jsx
{activityStatus === 'Offline' && (
  <button onClick={checkOpenClawHealth}>
    Retry Connection
  </button>
)}
```

## Files Modified

- `src/stores/botStore.js` - Added health check functions
- `src/components/BotAvatar.jsx` - Integrated health checks
- `src/api/client.js` - Already configured for API calls

## Related Documentation

- [OpenClaw Workspace Integration](../../mosbot-api/docs/openclaw-workspace-integration.md)
- [MosBot API Routes](../../mosbot-api/src/routes/openclaw.js)
- [Workspace Service](../../homelab-gitops/apps/homelab/openclaw/workspace-service/README.md)

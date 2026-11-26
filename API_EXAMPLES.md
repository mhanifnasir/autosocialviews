# API Examples

## Authentication & Setup

All endpoints are prefixed with `/api`

## Session Management

### Create Session
```bash
POST /api/sessions
Content-Type: application/json

{
  "layoutType": "2x2",
  "activePlayerCount": 4,
  "userId": "user123"
}

Response:
{
  "id": 1,
  "user_id": "user123",
  "layout_type": "2x2",
  "active_players": 4,
  "created_at": "2024-05-31T10:00:00Z",
  "updated_at": "2024-05-31T10:00:00Z"
}
```

### Get Current Session
```bash
GET /api/sessions/current?userId=user123

Response:
{
  "id": 1,
  "user_id": "user123",
  "layout_type": "2x2",
  "active_players": 4,
  "created_at": "2024-05-31T10:00:00Z",
  "updated_at": "2024-05-31T10:00:00Z"
}
```

### Update Session
```bash
PATCH /api/sessions/1
Content-Type: application/json

{
  "layoutType": "3x3",
  "activePlayerCount": 9
}

Response:
{
  "id": 1,
  "user_id": "user123",
  "layout_type": "3x3",
  "active_players": 9,
  "created_at": "2024-05-31T10:00:00Z",
  "updated_at": "2024-05-31T10:15:00Z"
}
```

## Queue Management

### Add Video
```bash
POST /api/queue
Content-Type: application/json

{
  "youtubeId": "dQw4w9WgXcQ",
  "title": "Never Gonna Give You Up",
  "description": "Rick Astley - Never Gonna Give You Up",
  "thumbnailUrl": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "duration": 212
}

Response:
{
  "id": 1,
  "youtube_id": "dQw4w9WgXcQ",
  "title": "Never Gonna Give You Up",
  "description": "Rick Astley - Never Gonna Give You Up",
  "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "duration": 212,
  "added_at": "2024-05-31T10:00:00Z"
}
```

### Bulk Add Videos
```bash
POST /api/queue/bulk
Content-Type: application/json

{
  "videos": [
    {
      "youtubeId": "dQw4w9WgXcQ",
      "title": "Video 1",
      "thumbnailUrl": "..."
    },
    {
      "youtubeId": "jNQXAC9IVRw",
      "title": "Video 2",
      "thumbnailUrl": "..."
    }
  ]
}

Response: Array of video objects
```

### Get Queue
```bash
GET /api/queue

Response:
[
  {
    "id": 1,
    "youtube_id": "dQw4w9WgXcQ",
    "title": "Never Gonna Give You Up",
    "description": "Rick Astley - Never Gonna Give You Up",
    "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    "duration": 212,
    "added_at": "2024-05-31T10:00:00Z"
  }
]
```

### Remove Video
```bash
DELETE /api/queue/1

Response:
{
  "message": "Video removed"
}
```

## Player Management

### Get Session Players
```bash
GET /api/sessions/1/players

Response:
[
  {
    "id": 1,
    "session_id": 1,
    "slot_number": 1,
    "video_id": 1,
    "playback_position": 0,
    "is_playing": false,
    "volume": 50,
    "playback_speed": 1.0,
    "youtube_id": "dQw4w9WgXcQ",
    "title": "Never Gonna Give You Up",
    "thumbnail_url": "...",
    "created_at": "2024-05-31T10:00:00Z",
    "updated_at": "2024-05-31T10:00:00Z"
  }
]
```

### Assign Video to Slot
```bash
POST /api/sessions/1/players/1
Content-Type: application/json

{
  "videoId": 1
}

Response: Player object with assigned video
```

### Remove Video from Slot
```bash
POST /api/sessions/1/players/1
Content-Type: application/json

{
  "videoId": null
}

Response: Empty player slot object
```

### Update Player State
```bash
PATCH /api/sessions/1/players/1
Content-Type: application/json

{
  "isPlaying": true,
  "volume": 75,
  "playbackSpeed": 1.5,
  "playbackPosition": 120
}

Response: Updated player object
```

## Bulk Controls

### Play All
```bash
POST /api/sessions/1/bulk-controls
Content-Type: application/json

{
  "action": "play"
}

Response:
{
  "action": "play",
  "affectedPlayers": 4,
  "players": [...]
}
```

### Pause All
```bash
POST /api/sessions/1/bulk-controls
Content-Type: application/json

{
  "action": "pause"
}
```

### Mute All
```bash
POST /api/sessions/1/bulk-controls
Content-Type: application/json

{
  "action": "mute"
}
```

### Unmute All
```bash
POST /api/sessions/1/bulk-controls
Content-Type: application/json

{
  "action": "unmute"
}
```

## Error Handling

All error responses follow this format:

```json
{
  "error": "Error message here"
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Server Error

## Testing with cURL

```bash
# Add video to queue
curl -X POST http://localhost:5000/api/queue \
  -H "Content-Type: application/json" \
  -d '{
    "youtubeId": "dQw4w9WgXcQ",
    "title": "Never Gonna Give You Up"
  }'

# Get queue
curl http://localhost:5000/api/queue

# Create session
curl -X POST http://localhost:5000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "layoutType": "2x2",
    "activePlayerCount": 4
  }'

# Get session players
curl http://localhost:5000/api/sessions/1/players

# Play all
curl -X POST http://localhost:5000/api/sessions/1/bulk-controls \
  -H "Content-Type: application/json" \
  -d '{"action": "play"}'
```

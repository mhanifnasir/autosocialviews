# AutoViews - Multi-Player Dashboard

A professional monitoring dashboard application for watching multiple YouTube videos simultaneously from a shared queue.

## Features

### 🎬 Multi-Video Playback
- Play up to 16 YouTube videos simultaneously
- Independent controls for each player (play/pause, mute/unmute, volume, speed)
- Real-time playback synchronization

### 📊 Dashboard Layouts
- **1x1**: Single video view
- **2x2**: 4 videos (Quad View)
- **2x3**: 6 videos
- **3x3**: 9 videos
- **4x3**: 12 videos
- **4x4**: 16 videos
- Resizable video cards
- Drag-and-drop positioning (future)

### 🎮 Bulk Controls
- Play All / Pause All
- Mute All / Unmute All
- Sync Start (future)
- Stop All

### 🎯 Queue Management
- Add videos to shared queue
- Assign videos to specific player slots
- Auto-fill empty slots
- Replace videos without page refresh

### ⚡ Performance Optimization
- Lazy loading of YouTube players
- Thumbnail loading before video player
- Virtualized dashboard rendering
- Efficient memory usage
- Real-time player status monitoring

### 🎨 User Interface
- Professional dark mode dashboard
- Real-time player status indicators
- Grid management controls
- Full-screen individual player support
- Responsive design

### 💾 User Preferences
- Save dashboard layout preference
- Save default player count
- Save volume settings per session
- Save playback speed preferences

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **YouTube IFrame API** - Video player
- **Axios** - API client

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **SQLite3** - Database
- **CORS** - Cross-origin handling
- **Morgan** - Request logging

## Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Setup

1. **Clone the repository**
```bash
cd autoviews
```

2. **Install server dependencies**
```bash
cd server
npm install
```

3. **Install client dependencies**
```bash
cd ../client
npm install
```

## Running the Application

### Terminal 1 - Start the Backend Server
```bash
cd server
npm run dev
```
The server will start on `http://localhost:5000`

### Terminal 2 - Start the Frontend Development Server
```bash
cd client
npm run dev
```
The client will start on `http://localhost:5173` (Vite default)

Visit `http://localhost:5173` in your browser to access the dashboard.

## API Endpoints

### Sessions
- `GET /api/sessions/current` - Get or create current session
- `POST /api/sessions` - Create new session
- `PATCH /api/sessions/:id` - Update session settings
- `GET /api/sessions/:sessionId/players` - Get players for session

### Players
- `POST /api/sessions/:sessionId/players/:slotNumber` - Assign video to slot
- `PATCH /api/sessions/:sessionId/players/:slotNumber` - Update player state
- `GET /api/sessions/:sessionId/players` - Get all players for session

### Queue
- `GET /api/queue` - Get all videos in queue
- `POST /api/queue` - Add video to queue
- `POST /api/queue/bulk` - Bulk add videos
- `DELETE /api/queue/:videoId` - Remove video from queue

### Bulk Controls
- `POST /api/sessions/:sessionId/bulk-controls` - Execute bulk action
  - Actions: `play`, `pause`, `mute`, `unmute`, `stop`

## Database Schema

### multi_player_sessions
- `id` - Primary key
- `user_id` - User identifier
- `layout_type` - Current layout (2x2, 3x3, 4x4, etc.)
- `active_players` - Number of active player slots
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### player_slots
- `id` - Primary key
- `session_id` - Reference to session
- `slot_number` - Player slot number (1-16)
- `video_id` - Reference to video
- `playback_position` - Current playback position in seconds
- `is_playing` - Playback state
- `volume` - Volume level (0-100)
- `playback_speed` - Playback speed multiplier (0.5-2.0)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### videos
- `id` - Primary key
- `youtube_id` - YouTube video ID
- `title` - Video title
- `description` - Video description
- `thumbnail_url` - Thumbnail image URL
- `duration` - Video duration in seconds
- `added_at` - Addition timestamp

### user_preferences
- `id` - Primary key
- `user_id` - User identifier
- `default_layout` - Preferred layout
- `default_player_count` - Preferred player count
- `default_volume` - Preferred volume
- `default_playback_speed` - Preferred playback speed
- `theme` - UI theme (dark/light)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Usage Guide

### Basic Workflow
1. **Create/Load Session** - Dashboard loads or creates a new session
2. **Add Videos** - Add YouTube videos to the queue
3. **Assign Videos** - Click videos from queue to assign to player slots
4. **Play** - Use controls to play, pause, adjust volume/speed per player
5. **Bulk Controls** - Use Play All/Pause All buttons for synchronized control
6. **Switch Layout** - Change grid layout on the fly

### Advanced Features
- **Lazy Loading**: Players are created on-demand when slot is activated
- **Auto-fill**: Empty slots automatically load next video from queue
- **Sync State**: Session state persists across browser refreshes
- **Performance**: Handles 16 simultaneous video streams efficiently

## Future Enhancements

- [ ] Drag-and-drop video positioning
- [ ] Custom layout editor
- [ ] Video recording/download from dashboard
- [ ] Chat/collaboration features
- [ ] Advanced playback sync controls
- [ ] Picture-in-picture support
- [ ] Mobile app version
- [ ] Multiple user sessions
- [ ] Cloud storage integration

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ for video enthusiasts**

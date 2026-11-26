# Development Guide

## Project Structure

```
autoviews/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                # Node.js backend
│   ├── controllers/       # Request handlers
│   ├── routes/            # API routes
│   ├── database.js        # SQLite setup
│   ├── index.js           # Express app
│   └── package.json
│
├── README.md
├── API_EXAMPLES.md
├── setup.sh               # Unix setup script
├── setup.bat              # Windows setup script
└── .gitignore
```

## Architecture Overview

### Frontend (React)
- **Vite** - Fast build tool for development
- **Tailwind CSS** - Utility-first CSS framework
- **YouTube IFrame API** - Video player integration
- **Axios** - HTTP client for API calls

### Backend (Express.js)
- **SQLite** - Lightweight database
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logging
- **Body Parser** - JSON request parsing

### Communication Flow
```
React Component → Axios API Call → Express Route Handler → 
SQLite Database → Response → React Component Update
```

## Key Features Implementation

### 1. Multi-Player Grid
- Dynamic grid layout based on selected layout type
- Responsive aspect ratios using CSS Grid
- Lazy loading of YouTube players
- Real-time player status indicators

### 2. YouTube Integration
- YouTube IFrame API for embedding players
- Independent player instance per slot
- Player methods exposed via window object
- Support for play/pause/volume/speed controls

### 3. Bulk Controls
- Database updates for all players in session
- Synchronized state across all player slots
- Promise-based concurrent updates

### 4. Queue Management
- Video storage in SQLite
- Quick assignment to any player slot
- Persistent queue state
- Support for bulk video import

### 5. Session Persistence
- Session data stored in database
- Automatic session creation on first load
- Layout preferences saved per user
- Player state persistence

## Development Workflow

### Adding a New Feature

1. **Backend (API)**
   - Add database schema if needed
   - Create controller function
   - Add route in routes/index.js
   - Test with cURL or Postman

2. **Frontend (Component)**
   - Create React component
   - Use api.js for backend calls
   - Add styling with Tailwind
   - Integrate into main Dashboard

3. **Testing**
   - Run backend: `npm run dev` in server/
   - Run frontend: `npm run dev` in client/
   - Test in browser at localhost:5173

### Common Tasks

**Update Database Schema:**
```javascript
// In database.js
db.run(`CREATE TABLE IF NOT EXISTS new_table (...)`)
```

**Add New API Endpoint:**
```javascript
// In routes/index.js
router.post('/new-endpoint', controller.newFunction)

// In controllers/newController.js
exports.newFunction = async (req, res) => {
  // Implementation
}
```

**Create React Component:**
```javascript
// In src/components/NewComponent.jsx
import React from 'react'

function NewComponent() {
  return <div>Component</div>
}

export default NewComponent
```

**Style with Tailwind:**
```jsx
<div className="bg-dark text-white p-4 rounded hover:bg-dark-secondary">
  Tailwind styles
</div>
```

## Performance Optimization

### Frontend
- **Lazy Loading**: Players only initialize when slot is activated
- **Thumbnail Preview**: Show thumbnails before loading player
- **Virtualized Rendering**: Only render visible grid cells
- **Memoization**: Use React.memo for player components

### Backend
- **Database Indexing**: Add indexes on frequently queried columns
- **Query Optimization**: Use SELECT only needed columns
- **Connection Pooling**: Reuse database connections
- **Caching**: Cache queue and session data

### YouTube Players
- **Defer Loading**: Load YouTube API script asynchronously
- **Player Pooling**: Reuse player instances when possible
- **Memory Management**: Properly destroy players when slots are cleared

## Debugging

### Browser DevTools
- React DevTools for component inspection
- Network tab to monitor API calls
- Console for JavaScript errors

### Server Logging
- Morgan logs all HTTP requests
- Console logs database operations
- Error stack traces in terminal

### Database Inspection
```bash
# SQLite command line
sqlite3 videos.db
sqlite> SELECT * FROM videos;
sqlite> SELECT * FROM player_slots;
```

## Performance Metrics

### Current Capabilities
- **Simultaneous Players**: Up to 16 YouTube videos
- **Queue Size**: No practical limit
- **Load Time**: ~2-3 seconds for 4-player dashboard
- **Memory Usage**: ~150MB for 16-player view

### Optimization Areas
- [ ] Implement server-side caching
- [ ] Add database query optimization
- [ ] Use WebWorkers for heavy computations
- [ ] Implement image lazy loading
- [ ] Add compression for network requests

## Testing

### Manual Testing Checklist
- [ ] Create session
- [ ] Add videos to queue
- [ ] Assign video to player slot
- [ ] Play/pause single player
- [ ] Play/pause all players
- [ ] Change volume per player
- [ ] Change playback speed
- [ ] Switch layout
- [ ] Refresh page and verify state persistence

### API Testing
```bash
# Test health endpoint
curl http://localhost:5000/health

# Test session creation
curl -X POST http://localhost:5000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"layoutType": "2x2"}'
```

## Troubleshooting

### Issue: YouTube players not loading
- Check if YouTube IFrame API is loaded
- Verify video IDs are valid
- Check browser console for errors

### Issue: API calls failing
- Verify backend server is running
- Check CORS settings
- Review network requests in DevTools

### Issue: Database locked
- Close all database connections
- Restart server
- Check file permissions on videos.db

### Issue: State not persisting
- Verify database is being updated
- Check browser localStorage settings
- Review session creation logic

## Deployment

### Production Build
```bash
# Frontend
cd client
npm run build
# Output in client/dist/

# Backend
# Set NODE_ENV=production
npm start
```

### Environment Variables
```
PORT=5000
NODE_ENV=production
DATABASE_URL=/path/to/videos.db
CORS_ORIGIN=https://yourdomain.com
```

## Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Express.js](https://expressjs.com)
- [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Commit with clear messages
5. Push and create a Pull Request

## Support

For issues and questions, refer to:
- README.md for overview
- API_EXAMPLES.md for API usage
- DEVELOPMENT.md (this file) for architecture and guide

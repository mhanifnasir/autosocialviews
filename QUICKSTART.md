# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 16 or higher installed
- YouTube video URLs ready

### Step 1: Install Dependencies

**On Windows:**
```bash
# Run the setup script
setup.bat
```

**On macOS/Linux:**
```bash
# Run the setup script
chmod +x setup.sh
./setup.sh
```

**Manual Installation:**
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Step 2: Start the Server

```bash
cd server
npm run dev
```

You should see:
```
✓ Database initialized
🎯 Multi-Player Dashboard Server
📡 Running on http://localhost:5000
🔌 API: http://localhost:5000/api
💚 Health: http://localhost:5000/health
```

### Step 3: Start the Client (in a new terminal)

```bash
cd client
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Step 4: Open in Browser

Visit: **http://localhost:5173**

You should see the Multi-Player Dashboard with:
- Empty grid (waiting for videos)
- Layout selector buttons (1, 4, 6, 9, 12, 16 videos)
- Bulk controls (Play All, Pause All, Mute All, Unmute All)
- Queue panel on the right side

### Step 5: Add Videos

**Option A: Add videos via Queue Panel**
1. Click on a player slot to select it
2. In the Queue Panel, click "Add to Queue" button (if available in UI)

**Option B: Test with API (cURL)**

```bash
# Add a test video
curl -X POST http://localhost:5000/api/queue \
  -H "Content-Type: application/json" \
  -d '{
    "youtubeId": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up",
    "thumbnailUrl": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
  }'

# Add more videos
curl -X POST http://localhost:5000/api/queue \
  -H "Content-Type: application/json" \
  -d '{
    "youtubeId": "jNQXAC9IVRw",
    "title": "Me at the zoo",
    "thumbnailUrl": "https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg"
  }'
```

### Step 6: Play Videos

1. **Select Layout**: Click "4 Videos" button (2x2 grid)
2. **Assign Videos**: Click on videos in the Queue panel to assign them to player slots
3. **Play**: Click "Play All" to start all videos
4. **Control**: Use individual player controls for each video

## Common YouTube Video IDs for Testing

```
dQw4w9WgXcQ        - Rick Astley - Never Gonna Give You Up
jNQXAC9IVRw        - Me at the zoo (first YouTube video)
9bZkp7q19f0        - PSY - GANGNAM STYLE
_6_m7GmzfL0        - Taylor Swift - Shake It Off
BJ0b4fTH4PY        - Eminem - Rap God
```

## Troubleshooting

### Issue: Can't connect to server
- Make sure backend is running on port 5000
- Check if Node.js is installed: `node --version`
- Kill any process using port 5000

### Issue: Videos not loading
- Verify YouTube video IDs are correct
- Check browser console for errors (F12)
- Make sure internet connection is stable

### Issue: Grid not showing
- Refresh the page (Ctrl+R or Cmd+R)
- Check if layout buttons are visible
- Try selecting a different layout

### Issue: Play button not working
- Ensure videos are assigned to player slots
- Check that YouTube players are loaded (should see black rectangles)
- Open browser console to check for errors

## Next Steps

1. **Explore Features**:
   - Try different layouts (4, 6, 9, 12, 16 videos)
   - Test bulk controls
   - Adjust individual player volume/speed

2. **Add More Videos**:
   - Use the API to add videos to queue
   - Build a larger video library for testing

3. **Customize**:
   - Modify dashboard styling in Tailwind
   - Add custom video metadata
   - Integrate with your own video source

4. **Deployment**:
   - See DEVELOPMENT.md for production build instructions
   - Configure environment variables
   - Deploy to your hosting platform

## Useful Commands

```bash
# Start development
npm run dev

# Build for production
npm run build

# Check health status
curl http://localhost:5000/health

# View all videos in queue
curl http://localhost:5000/api/queue

# Create a session
curl -X POST http://localhost:5000/api/sessions

# Full API documentation
# See API_EXAMPLES.md
```

## Project Structure Quick Reference

```
client/          - React frontend (Vite + Tailwind)
server/          - Express.js backend (Node.js)
README.md        - Project overview
API_EXAMPLES.md  - API usage examples
DEVELOPMENT.md   - Development guide
QUICKSTART.md    - This file
```

## Getting Help

- **API Issues**: Check `API_EXAMPLES.md`
- **Development**: See `DEVELOPMENT.md`
- **Errors**: Check browser console and server logs
- **Features**: Read `README.md`

## Next Workshop

Once you're comfortable with the basics, explore:
- [ ] Advanced playback controls
- [ ] Custom layouts
- [ ] Video metadata extraction
- [ ] User preferences persistence
- [ ] Multi-user sessions
- [ ] Performance optimization

---

**Happy streaming! 🎬**

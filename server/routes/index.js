const express = require('express');
const sessionController = require('../controllers/sessionController');
const playerController = require('../controllers/playerController');
const queueController = require('../controllers/queueController');
const bulkControlsController = require('../controllers/bulkControlsController');
const preferencesController = require('../controllers/preferencesController');
const youtubeController = require('../controllers/youtubeController');
const googleSearchController = require('../controllers/googleSearchController');

const router = express.Router();

// Google Search endpoints
router.get('/google/search', googleSearchController.searchVideos);

// Session endpoints
router.get('/sessions/current', sessionController.getCurrentSession);
router.post('/sessions', sessionController.createSession);
router.patch('/sessions/:id', sessionController.updateSession);
router.post('/sessions/:id/reset', sessionController.resetSession);

// Player endpoints
router.post('/sessions/:sessionId/players/:slotNumber', playerController.assignVideo);
router.patch('/sessions/:sessionId/players/:slotNumber', playerController.updatePlayer);
router.get('/sessions/:sessionId/players', playerController.getPlayers);

// Queue endpoints
router.get('/queue', queueController.getQueue);
router.get('/queue/shuffle', queueController.shuffleQueue);
router.post('/queue/auto-fill', queueController.autoFill);
router.post('/queue', queueController.addVideo);
router.post('/queue/bulk', queueController.bulkAddVideos);
router.delete('/queue', queueController.clearQueue);
router.delete('/queue/:videoId', queueController.removeVideo);

// Bulk controls endpoints
router.post('/sessions/:sessionId/bulk-controls', bulkControlsController.bulkAction);

// Preferences endpoints
router.get('/preferences/:userId', preferencesController.getPreferences);
router.post('/preferences/:userId', preferencesController.savePreferences);

// YouTube endpoints
router.get('/youtube/channels/search', youtubeController.searchChannels);
router.get('/youtube/channels/:channelId/uploads', youtubeController.getChannelUploads);
router.post('/youtube/channels/:channelId/import', youtubeController.importChannelUploads);
router.post('/youtube/playlists/:playlistId/import', youtubeController.importPlaylist);

module.exports = router;

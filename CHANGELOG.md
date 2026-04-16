# Changelog

All notable changes to SubNotes will be documented in this file.

## [Unreleased] - 2025-01-21

### ✨ Added
- **Background Processing Queue** - Non-blocking task management system
  - Queue multiple videos, playlists, and articles for background processing
  - **ProcessingQueueModal**: Dedicated modal to view and manage all tasks
  - **Real-time progress tracking**: See progress for playlists and individual tasks
  - **Non-blocking UI**: Close dialogs and continue using the app while processing
  - **Task management**: Retry failed tasks, clear completed tasks, view detailed errors
  - **Queue badge**: Visual indicator showing active/queued task count in header
  - **Sequential processing**: Tasks processed one at a time with automatic queue worker
  - **Persistent state**: Queue persists while app is running (survives dialog closes)
  - Comprehensive documentation: `docs/PROCESSING_QUEUE.md`

- **YouTube Playlist Support** - Process entire playlists in one go
  - Automatically detects playlist URLs (`list=` parameter)
  - Fetches all videos using YouTube Data API v3 `playlistItems` endpoint
  - Handles pagination for playlists with 50+ videos
  - Real-time progress tracking with visual progress bar
  - Shows "X of Y videos" during processing
  - Error-resilient: individual video failures don't stop the playlist
  - Rate limiting: 1-second delay between videos
  - Integrated with processing queue for background execution
  - Comprehensive documentation: `docs/PLAYLIST_SUPPORT.md`

---

## [Unreleased] - 2025-01-20

### 🔄 Changed
- **BREAKING**: Migrated subscription auto-processing from server-side (pg_cron) to client-side (Electron app)
  - Processing now runs on app startup/login instead of every 6 hours on the server
  - Uses `subscriptions.last_checked_at` as bookmark to fetch only new content
  - Enables proper transcript fetching via Electron IPC
  - Simplifies architecture by removing pg_cron infrastructure

### ✨ Added
- Client-side subscription processing service (`src/services/subscriptionProcessingService.ts`)
- Auto-processing React hook (`src/hooks/useAutoSubscriptionProcessing.ts`)
- Integrated auto-processing into Dashboard component (runs once per session)
- Toast notifications when new content is found from subscriptions
- **Retry button** for failed/pending/stuck summaries (Electron app only)
  - Appears conditionally based on summary status
  - Shows error messages to users
  - Spinning icon animation while retrying
  - Reuses existing `processVideoLocally()` logic
- **Rate limiting** for YouTube API calls to avoid quota exhaustion
  - 1 second delay between subscriptions
  - 1 second delay between videos within subscriptions
  - Progress indicators showing "X/Y subscriptions" in logs
- **Error message display** in summaries list
  - Shows specific error reason (e.g., "Failed to fetch transcript")
  - Helpful hints like "Click the retry button above to try again"
- Comprehensive documentation: `docs/CLIENT_SIDE_PROCESSING.md`, `docs/RETRY_BUTTON_FEATURE.md`, `docs/RATE_LIMITING.md`

### 🗑️ Removed
- pg_cron infrastructure (cron jobs, monitoring tables)
- `cron_job_runs` table and related views (`cron_job_health`, `cron_job_alerts`)
- Server-side `process-subscriptions` edge function (deprecated, see README in function directory)
- `CRON_SECRET` environment variable (no longer needed)

### 📋 Migration
- Run migration: `20250120000000_remove_cron_infrastructure.sql`
- No user action required - auto-processing works on next app launch
- See `docs/AUTO_PROCESSING.md` for migration details

---

## [0.2.0] - 2025-10-13

### 🎉 Major Features

#### Multi-Source Content Support
- **Generic Subscription System**: Refactored from YouTube-only to support multiple content sources
- **Substack Support**: Subscribe to Substack newsletters and get AI summaries of articles
- **RSS Feed Support**: Infrastructure ready for any RSS-based content source
- **Podcast Support**: Infrastructure ready for audio content with transcription

#### Visual Content Analysis
- **Multimodal AI Summaries**: Articles now include visual content analysis
- **Image Extraction**: Automatically extracts and analyzes images, charts, diagrams from articles
- **Context-Aware Processing**: Preserves image alt text and captions for better understanding
- **Smart Filtering**: Filters out icons, tracking pixels, and low-quality images

#### Bring Your Own Key (BYOK) Tier
- **Tier 99**: New $3/month tier for users with their own API keys
- **Unlimited Usage**: Unlimited subscriptions and summaries with your own keys
- **API Key Management**: Secure UI for managing YouTube and Gemini API keys
- **Cost Savings**: Stay within free tiers for typical usage

### 🔧 Technical Improvements

#### Database Refactor
- **Generic Schema**: `subscriptions` table now supports multiple source types
- **Content Summaries**: Renamed from `video_summaries` to support all content types
- **Metadata Storage**: JSONB columns for source-specific data
- **Better Indexing**: Optimized indexes for multi-source queries

#### Edge Functions
- **Modular Processors**: Separate processors for each content source type
- **Article Content Extraction**: Advanced HTML parsing and cleaning
- **Image Processing**: Base64 encoding for Gemini multimodal API
- **Error Handling**: Improved error messages and logging

#### Auto-Processing
- **Multi-Source Processing**: Cron job now handles YouTube + Substack
- **Rate Limiting**: Smart throttling per source type
- **Processing Logs**: Detailed logs for debugging and monitoring

### 📚 Documentation
- **Generic Subscriptions Design**: Comprehensive architecture document
- **BYOK Tier Guide**: Setup and usage instructions
- **Auto-Processing Setup**: Simplified deployment guide

### 🐛 Bug Fixes
- Fixed tier checking for existing users
- Improved error handling for failed API calls
- Better handling of custom domain Substack publications

### 🔄 Breaking Changes
- **Database Schema**: Complete refactor of subscriptions and summaries tables
- **Pre-launch**: Safe to deploy as production database was reset
- **Edge Function APIs**: Updated to accept `sourceType` and `contentType` parameters

### 📝 Migration Notes
- For fresh installations: All migrations apply automatically
- For existing databases: Use `supabase db reset` to apply new schema
- User data: Should be backed up before migrating (though pre-launch = no users yet)

---

## [0.1.1] - 2025-10-10

### Features
- Waitlist mode for pre-launch
- Email collection system
- Terms of service dialog

---

## [0.1.0] - 2025-10-08

### Initial Release
- YouTube channel subscriptions
- AI-powered video summaries
- Obsidian vault integration
- Electron desktop app
- Subscription tiers (0-5)
- Auto-processing with pg_cron
- Transcript caching
- Email notifications

---

## Version Format

We use [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backward compatible manner
- **PATCH** version for backward compatible bug fixes

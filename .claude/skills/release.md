# Release Skill

End-to-end workflow for building a versioned release of the Sub-Notes Electron app, uploading artifacts to Supabase Storage, and registering metadata so the download page picks up the new version.

## Prerequisites

- `bun i` has been run (dependencies installed)
- `.env` contains `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Supabase CLI is installed and linked (`supabase login` + `supabase link`)
- `gh` CLI is installed and authenticated (only needed for GitHub releases)

## End-to-End Release (Recommended)

### Step 1 — Bump version

Edit `package.json` and update the `"version"` field. Use semver (e.g., `0.3.5` → `0.3.6`). The version in `package.json` determines the output folder name (`release/<version>/`) and artifact filenames.

### Step 2 — Build the Electron app

Pick the target platform:

```bash
# macOS (DMG + ZIP)
bun run build:mac

# Windows (NSIS installer + portable EXE, x64)
bun run build:win

# Linux (AppImage + .deb)
bun run build:linux

# All platforms in one pass
bun run build:all
```

Artifacts land in `release/<version>/` (e.g., `release/0.3.6/`).

macOS builds run an ad-hoc code signing step via `scripts/after-sign-hook.cjs`. No Apple Developer identity is required (config has `identity: null`).

### Step 3 — Upload to Supabase Storage + register metadata

**One command for macOS DMG** (handles both upload and metadata):

```bash
./scripts/upload-release-v2.sh v0.3.6 "Changelog text here"
```

This script:
1. Finds the DMG in `release/0.3.6/`
2. Uploads it to Supabase Storage at `releases/v0.3.6/<filename>` via REST API using the service role key
3. Calls `node scripts/add-release.mjs` to upsert a row in `public.releases` with the public download URL and file size

The public URL pattern is:
```
https://<project>.supabase.co/storage/v1/object/public/releases/v<version>/<filename>
```

### Step 4 (Optional) — GitHub release

```bash
./scripts/release.sh v0.3.6
```

Creates a GitHub release tag (via `gh`) and uploads the DMG. Useful for changelog/tagging even though downloads are served from Supabase.

## Multi-Platform Metadata

When releasing for both macOS and Windows, use `add-release-v2.mjs` to register both URLs in one row:

```bash
node scripts/add-release-v2.mjs v0.3.6 \
  --mac "https://REDACTED_PROJECT_ID.supabase.co/storage/v1/object/public/releases/v0.3.6/SubNotes-0.3.6-arm64.dmg" \
  --windows "https://REDACTED_PROJECT_ID.supabase.co/storage/v1/object/public/releases/v0.3.6/SubNotes-0.3.6-x64.exe" \
  --changelog "Release notes here"
```

This upserts `mac_dmg_url`, `mac_dmg_size`, `windows_exe_url`, and `windows_exe_size` into the `public.releases` table. It auto-detects file sizes from the local `release/<version>/` directory.

## Manual / Fallback Flow

If the automated upload script fails (e.g., file too large for REST API):

1. **Upload via Supabase Dashboard**:
   - Navigate to the Storage bucket: `releases`
   - Create a folder named `v<version>` (e.g., `v0.3.6`)
   - Upload the DMG/EXE file

2. **Register metadata via CLI**:
   ```bash
   ./scripts/add-release-metadata.sh v0.3.6 \
     "https://REDACTED_PROJECT_ID.supabase.co/storage/v1/object/public/releases/v0.3.6/SubNotes-0.3.6-arm64.dmg" \
     "Changelog text"
   ```
   This runs an `INSERT ... ON CONFLICT` against the linked Supabase project using `supabase db execute`.

## Scripts Reference

| Script | Purpose |
|---|---|
| `scripts/upload-release-v2.sh` | Upload DMG to Supabase Storage + register metadata (recommended) |
| `scripts/upload-release.sh` | Older version using `supabase storage cp` (experimental CLI flag) |
| `scripts/add-release.mjs` | Upsert release metadata via Supabase JS client (mac-only) |
| `scripts/add-release-v2.mjs` | Upsert release metadata with `--mac` and `--windows` flag support |
| `scripts/add-release-metadata.sh` | Upsert release metadata via `supabase db execute` SQL (mac-only) |
| `scripts/release.sh` | Create GitHub release + upload DMG via `gh` CLI |
| `scripts/after-sign-hook.cjs` | Ad-hoc codesign hook for macOS builds (runs automatically) |

## Database Schema

The `public.releases` table:

| Column | Type | Notes |
|---|---|---|
| `version` | text (unique) | e.g., `0.3.6` (no `v` prefix) |
| `tag_name` | text | e.g., `v0.3.6` |
| `name` | text | Display name |
| `changelog` | text | Release notes |
| `mac_dmg_url` | text | Public download URL for macOS DMG |
| `mac_dmg_size` | bigint | File size in bytes |
| `windows_exe_url` | text | Public download URL for Windows EXE |
| `windows_exe_size` | bigint | File size in bytes |
| `published_at` | timestamptz | Release date |

The `/download` page queries this table for the latest release automatically.

## Decision Guide

- **"Release a new version"** → Run steps 1-3 above. Ask the user for the new version number and changelog text.
- **"Release for macOS"** → `bun run build:mac` then `./scripts/upload-release-v2.sh v<X.Y.Z> "<changelog>"`
- **"Release for Windows"** → `bun run build:win` then manually upload EXE to Supabase Storage, then `node scripts/add-release-v2.mjs v<X.Y.Z> --windows "<url>" --changelog "<text>"`
- **"Release for all platforms"** → `bun run build:all`, upload each artifact, then use `add-release-v2.mjs` with both `--mac` and `--windows` flags.
- **"Upload failed"** → Fall back to manual dashboard upload + `add-release-metadata.sh`.
- **"Also tag on GitHub"** → Run `./scripts/release.sh v<X.Y.Z>` after Supabase upload is done.
- **Only metadata update needed (artifact already uploaded)** → Use `add-release-metadata.sh` or `add-release-v2.mjs` directly.

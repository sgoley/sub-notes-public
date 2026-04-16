# Build Skill

Build the Sub-Notes application using bun. This project has two build targets: **web** (Vite SPA) and **Electron** (desktop app). All commands use `bun run`.

## Prerequisites

Install dependencies first if `node_modules/` is missing or stale:

```bash
bun i
```

## Quick Reference

| Goal | Command |
|---|---|
| Web dev server | `bun run dev` |
| Web production build | `bun run build` |
| Web development build | `bun run build:dev` |
| Electron dev server | `bun run dev:electron` |
| Electron + Supabase local dev | `bun run dev:full` |
| Electron app — macOS | `bun run build:mac` |
| Electron app — Windows | `bun run build:win` |
| Electron app — Linux | `bun run build:linux` |
| Electron app — all platforms | `bun run build:all` |
| Lint | `bun run lint` |

## Web Builds

### Development server (hot reload)

```bash
bun run dev
```

Starts Vite on `http://localhost:8080` with HMR. Uses default Vite mode. Component auto-tagging (`lovable-tagger`) is enabled in development mode only.

### Production build

```bash
bun run build
```

Alias for `bun run build:web`. Outputs optimized static files to `dist/`. Base path is `/`.

### Development-mode build (no minification, source maps)

```bash
bun run build:dev
```

Builds with `--mode development`. Useful for debugging production-like output without minification.

## Electron Builds

Electron builds are a two-step process handled by the npm scripts:
1. **Renderer build**: `vite build --mode electron` — builds the React frontend with `base: "./"` and externalizes the `electron` module. Output goes to `dist/`.
2. **Packaging**: `electron-builder` — packages `dist/` and `dist-electron/` (compiled main + preload) into platform installers.

The npm scripts chain these automatically. Do NOT run `electron-builder` alone without building the renderer first.

### Electron dev server

```bash
bun run dev:electron
```

Starts Vite in `electron` mode. This enables the `vite-plugin-electron` plugin which compiles `electron/main.ts` and `electron/preload.ts` and launches the Electron window pointing at the Vite dev server.

### Full local dev (Supabase + Edge Functions + Vite)

```bash
bun run dev:full
```

Runs `./dev.sh` which starts Supabase local, serves Edge Functions, and starts Vite. Requires Supabase CLI installed. Ctrl+C stops all services.

### Build for macOS

```bash
bun run build:mac
```

Produces DMG and ZIP in `release/<version>/`. Configured for `public.app-category.productivity`. Icon: `public/icon.icns`. Code signing is configured via `scripts/after-sign-hook.cjs` (set `identity: null` in config to skip signing).

### Build for Windows

```bash
bun run build:win
```

Produces NSIS installer + portable EXE (x64) in `release/<version>/`. Icon: `public/icon.ico`.

### Build for Linux

```bash
bun run build:linux
```

Produces AppImage and .deb in `release/<version>/`. Icon: `public/icon.png`.

### Build for all platforms

```bash
bun run build:all
```

Builds macOS, Windows, and Linux targets in one pass. Note: cross-platform builds may require platform-specific tooling (e.g., building Windows on macOS requires Wine).

## Build Outputs

| Target | Output directory | Artifacts |
|---|---|---|
| Web | `dist/` | Static HTML/JS/CSS |
| Electron renderer | `dist/` | Static files (base `./`) |
| Electron main/preload | `dist-electron/` | Compiled `main.js`, `preload.js` |
| Electron packages | `release/<version>/` | DMG, ZIP, NSIS, AppImage, etc. |

## Linting

```bash
bun run lint
```

Runs ESLint with TypeScript and React plugins.

## Decision Guide

- **User asks to "build the app"** with no qualifier → run `bun run build` (web production build).
- **User asks for Electron/desktop build** → ask which platform, then run the appropriate `build:mac`, `build:win`, or `build:linux`. If they say "all", run `build:all`.
- **User wants to test locally** → `bun run dev` for web, `bun run dev:electron` for Electron, `bun run dev:full` for full stack with Supabase.
- **Build fails with missing modules** → run `bun i` first, then retry.
- **Electron build fails on renderer** → the renderer step (`vite build --mode electron`) must succeed before `electron-builder` runs. Check Vite errors first.

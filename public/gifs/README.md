# Pricing Tier GIFs

These GIFs are used in the Settings page billing tiers (`src/pages/Settings.tsx`).

All GIFs are cached locally to prevent loss if external URLs break.

## Files

- **tier-0-shrug.gif** - Person shrugging "I don't know" gesture
  - Tier: "I mean, I'll try it" ($1/mo, 1 subscription)
  - Vibe: 🤷

- **tier-1-this-is-fine.gif** - "This is fine" dog sitting in burning room meme
  - Tier: "This is fine" ($3/mo, 3 subscriptions)
  - Vibe: 🔥

- **tier-2-budget.gif** - Person counting money/budget conscious
  - Tier: "I'm on a budget" ($5/mo, 7 subscriptions)
  - Vibe: 💰

- **tier-3-get-it.gif** - Light bulb moment / "aha!" realization
  - Tier: "Oh yeah, I get it" ($10/mo, 15 subscriptions)
  - Vibe: 🎯

- **tier-4-goggins.gif** - Intense workout/training (Goggins motivation)
  - Tier: "Goggins" ($20/mo, 30 subscriptions)
  - Vibe: 💪

- **tier-5-captain.gif** - "I'm the captain now" movie scene from Captain Phillips
  - Tier: "I'm the captain now" ($50/mo, unlimited subscriptions)
  - Vibe: ⚡

- **tier-99-byok-powers-combine.gif** - Captain Planet "powers combine" ring activation
  - Tier: "Bring Your Own Key" ($3/mo, unlimited, BYOK)
  - Vibe: 🔑

## Original Sources

All GIFs originally from Giphy.com, downloaded and cached on 2025-12-26.

## Usage

Referenced in `src/pages/Settings.tsx` via local paths:
```typescript
gif: "/gifs/tier-X-name.gif"
```

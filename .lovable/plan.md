

## Plan: Multiple App Updates

### 1. Remove Download Button from Auth Page
Remove the PWA install/download button section (lines 446-466) from `src/pages/Auth.tsx`. Also remove related PWA state and handler code (lines 53-54, 77-91) since they're no longer needed on this page.

### 2. Remove Download Counter from Download Page
Remove the download counter card section from `src/pages/Download.tsx` (the card showing `displayCount.toLocaleString()+`). Keep the rest of the page intact. Remove the `fetchCounter`, `maybeIncrement` functions and related state.

### 3. Fix Lucky Wheel Prize Bug
**Root cause**: In `src/pages/Index.tsx` lines 215 and 219, `balance + prize` uses the stale `balance` state value instead of the updated one. When `setBalance(prev => prev + prize)` runs on line 212, `balance` still holds the old value.

**Fix**: Change lines 215 and 219 to use a Supabase RPC increment or compute `balance + prize` correctly. The simplest fix is to use `balance + prize` consistently -- but the issue is that `balance` is already the old value and `setBalance` already added `prize`. So the DB update should also be `balance + prize`. Wait -- actually re-reading: `setBalance(prev => prev + prize)` updates React state, then `balance + prize` on line 215 also adds prize to the OLD balance value. So the DB should get `balance + prize` which is correct. 

Let me re-examine: the user says they win 10 but get 5. This could be the wheel animation landing on one segment but the code picking a different one. Looking at the wheel logic:

- `prizeIndex = Math.floor(Math.random() * 6)` picks the prize
- `targetAngle = 360 - (prizeIndex * segmentAngle + segmentAngle / 2)` controls where the wheel stops
- The pointer is at the TOP of the wheel

The segments are drawn starting at `-90` degrees (top). Segment 0 starts at top. The pointer is at the top. So when the wheel rotates by `targetAngle`, the segment that ends up at the top should be `prizeIndex`.

Let me check: if `prizeIndex = 4` (10 جنيه), `targetAngle = 360 - (4 * 60 + 30) = 360 - 270 = 90`. The wheel rotates 90 degrees clockwise, meaning segment index 1 (إعادة) would be at the top... This mapping seems wrong.

The issue is the wheel rotation vs segment positioning. The segments are drawn with SVG starting at -90 degrees. When the wheel rotates clockwise by `targetAngle`, the segment at position `prizeIndex` should align with the pointer.

Actually the formula `360 - (prizeIndex * segmentAngle + segmentAngle / 2)` makes the wheel stop so that segment `prizeIndex` is at the pointer position -- but only if the segments and pointer are aligned. Since segments start at -90° (top) and the pointer is also at top, the formula should work. But the cumulative rotation may cause issues.

The real problem: `finalRotation = rotation + spins * 360 + targetAngle`. Since `rotation` accumulates across spins, and `targetAngle` is absolute (not relative to current position), the modular position `finalRotation % 360` should equal `(rotation % 360) + targetAngle` mod 360. This doesn't necessarily align `prizeIndex` correctly after multiple spins because `rotation` keeps accumulating.

**Fix**: Compute `targetAngle` relative to make `finalRotation % 360 === targetAngle`. Use: `finalRotation = Math.ceil((rotation + 1) / 360) * 360 * spins + targetAngle` to ensure the final modular position is exactly `targetAngle`.

### 4. Admin Feature: Disable Features per User
Add a new admin capability to disable specific features (tasks, wheel, wallet, etc.) for individual users or in bulk. This requires:
- **Database**: Add a `disabled_features` JSONB column to `profiles` table (default `{}`)
- **Admin UI**: Add controls in AdminUsersTab to toggle features per user, and a bulk action option
- **App logic**: Check `disabled_features` in DailyTasks, LuckyWheel, WalletSection, etc.

### 5. Redesign Auth Page as Card Form
Improve the auth page styling to look more like a polished card-based form with smooth transitions between login and signup modes. The current structure already has a card -- enhance it with better spacing, animations for mode switching, and cleaner visual hierarchy.

### 6. Google/Apple OAuth Issues
The OAuth code in `handleOAuth` looks correct using `lovable.auth.signInWithOAuth`. The issue may be configuration-related. I'll check if the `navigateFallbackDenylist` for `/~oauth` is configured in the PWA settings.

### 7. Hide Lovable Badge
The Lovable badge can be hidden via project settings (Settings > "Hide 'Lovable' Badge"). This is a project setting, not a code change. I cannot hide it programmatically for a timed duration -- it's either on or off in project settings.

### 8. Project Deletion Question
I cannot send messages on your behalf to Lovable support. You need to contact them directly. Stopping project transfers may help, but if the project was already flagged, you should still contact support for clarification.

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Remove download button, clean up PWA code, polish card UI |
| `src/pages/Download.tsx` | Remove download counter section |
| `src/components/LuckyWheel.tsx` | Fix wheel rotation-to-prize alignment |
| `src/pages/Index.tsx` | Fix stale balance in handleSpinWheel |
| `src/components/admin/AdminUsersTab.tsx` | Add per-user feature disable controls |
| `vite.config.ts` | Add `/~oauth` to navigateFallbackDenylist for PWA |

### Database Migration
- Add `disabled_features` JSONB column to `profiles` table

### Important Notes
- **Lovable badge**: Go to Settings > "Hide 'Lovable' Badge" toggle to hide it. This cannot be done with a 1-hour timer via code.
- **Project deletion**: Contact Lovable support directly at https://lovable.dev/support or via Discord. I cannot send messages on your behalf.
- **OAuth**: Will ensure PWA config doesn't block the OAuth callback route.


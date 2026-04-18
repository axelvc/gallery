# AGENTS.md

## Quick start
- Install with `npm install`.
- Start Expo with `npm run start` (`npm run web`, `npm run ios`, `npm run android` are available too).
- If profile loading/images are involved, run the local proxy in a second terminal with `npm run instagram-proxy`.

## Required verification
- Run `npx tsc --noEmit` for typechecking. There is no dedicated `typecheck` script.
- Run `npm run lint` for linting.
- There is no test suite or build script in this repo right now; do not claim tests/build passed.

## Repo shape
- Runtime entrypoint is `expo-router/entry` from `package.json`; do not change `main` casually.
- Routing is minimal:
  - `app/_layout.tsx` = root layout
  - `app/index.tsx` = landing route (renders `@/features/entry/entry-screen`)
  - `app/gallery.tsx` = gallery route (renders `@/features/home/home-screen`)
- Real app logic lives in `features/home/`, not in route files.
- Imports use the `@/*` path alias from `tsconfig.json`.

## Home feature boundaries
- `features/home/home-screen.tsx` is composition only.
- `features/home/hooks/use-home-screen.ts` owns screen state, hydration, persistence, image picking, profile loading, and reorder state.
- `features/home/api/instagram.ts` is the client-side proxy consumer.
- `features/home/utils/persistence.ts` owns persisted snapshot storage.
- `features/home/components/photo-grid.tsx` owns the Drax grid.
- Shared visual tokens for this screen live in `constants/theme.ts`; prefer updating tokens there before scattering new raw colors/sizes.

## Instagram proxy gotchas
- The app does **not** fetch Instagram directly from the client. Profile and media loading depend on `scripts/instagram-proxy.mjs`.
- Proxy defaults to `http://localhost:8787` and supports:
  - `GET /instagram/profile`
  - `GET /instagram/media`
- On web, client code falls back to `http://localhost:8787` if `EXPO_PUBLIC_INSTAGRAM_PROXY_URL` is unset.
- On native, there is no localhost fallback; set `EXPO_PUBLIC_INSTAGRAM_PROXY_URL` to a reachable LAN host if testing on a device.
- If you change an `EXPO_PUBLIC_*` env var, do a full reload of Expo so the inlined value updates.

## Persistence gotchas
- Persistence is intentionally platform-split:
  - native → AsyncStorage
  - web → IndexedDB
- Persisted snapshot key/versioning is in `features/home/constants.ts` and `features/home/utils/persistence.ts`.
- Local picked images are stored as base64/data URLs so they survive reloads; be careful not to regress that when touching image-picker flow.

## Drax / gesture gotchas
- `GestureHandlerRootView` in `app/_layout.tsx` is required for the sortable grid. Do not remove it.
- Keep the Drax wiring intact in `photo-grid.tsx`:
  - `data={sortable.data}`
  - `keyExtractor={sortable.stableKeyExtractor}`
  - `onScroll={sortable.onScroll}`
  - `onContentSizeChange={sortable.onContentSizeChange}`
  - `scrollRef={listRef}` on `SortableContainer`
- `GRID_COLUMNS` must stay consistent between `useSortableList(...)` and `FlatList numColumns`.
- Locked Instagram items rely on `fixed={item.locked}` plus the unlocked/locked merge logic in `use-home-screen.ts`. Don’t replace that with ad hoc filtering.
- Reorder commits should flow through `onReorder`; avoid adding a second order mutation on drop or the grid can blink/swap.

## Config facts worth remembering
- `app.json` has `web.output = "static"`, so this repo does not include a built-in web API route layer.
- `app.json` also enables `newArchEnabled`, `typedRoutes`, and `reactCompiler`.
- The Expo image-picker plugin is already configured in `app.json`; keep permission-sensitive changes aligned with it.

## Workflow notes
- `.vscode/settings.json` uses `source.fixAll`, `source.organizeImports`, and `source.sortMembers` with `"explicit"`, so save does not auto-fix everything.
- `scripts/reset-project.js` is scaffold-reset tooling from create-expo-app. It can move or delete `app`, `components`, `hooks`, `constants`, and `scripts`; do not run it during normal feature work.
- The repo currently contains both `package-lock.json` and `pnpm-lock.yaml`. Do not change package manager assumptions unless the user asks.

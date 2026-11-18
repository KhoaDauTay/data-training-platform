# Third-party code and assets

Every asset or library taken from outside BoonData is listed here with its source, pinned version, licence and the date the licence text was read (ui-ux-v6 §1, T0). Add a row in the same commit that brings a new one in. Only self-made, CC0/public-domain, or licences that allow use, modification and redistribution in a public repo at no cost are allowed (no paid assets, no copyrighted characters, no "no redistribution in packs" terms).

## In use

BoonData's own mascot art (Lily, Boon) is not third-party: CC BY 4.0, `assets/mascots/LICENSE`.

| What | Source | Version | Licence | Checked | Where |
|---|---|---|---|---|---|
| Nunito Variable (latin + vietnamese woff2) | `@fontsource-variable/nunito` (npm), font by Vernon Adams et al. | 5.3.0 | SIL OFL 1.1 (`src/assets/fonts/OFL.txt`) | before v6 | `src/assets/fonts/` |
| GSAP core + MorphSVG, DrawSVG, MotionPath, Physics2D, CustomEase | `gsap` (npm), https://gsap.com | 3.15.1 | GSAP Standard "no charge" licence (https://gsap.com/standard-license): free incl. commercial use for any website/web app; forbids use in a no-code animation builder competing with Webflow and forbids removing the copyright notice. **Not an OSI licence: GSAP code is not MIT.** Keep its `@license` comment in the built chunk. | 2026-11-18 (npm `license` field + licence page) | `src/art/gsap.ts` (only importer), lazy chunk `gsap-*` (v6 T1); `@license` comments kept by `vite.config.ts` |
| Phosphor Icons (duotone) | `@phosphor-icons/core` (npm, devDependency), https://phosphoricons.com | 2.1.1 | MIT (`node_modules/@phosphor-icons/core/LICENSE`) | 2026-11-18 (npm `license` field + LICENSE file) | `scripts/icons.mjs` copies the paths named in `scripts/icon-map.json` into `src/ui/iconData.ts` (v6 T2); `scripts/icon-custom.json` holds BoonData's own icons in the same grammar (MIT) |

## Approved for v6 (add the "Where" when the task lands)

| What | Source | Version | Licence | Checked | Task |
|---|---|---|---|---|---|
| Natural Earth 1:110m land (`ne_110m_land.geojson`) | https://github.com/nvkelso/natural-earth-vector, raw file at commit `693f11422f4e08d2da4566b854dda53eb7c39fb3` (`geojson/ne_110m_land.geojson`, downloaded 2026-11-19) | 1:110m physical (repo `VERSION` 4.1.1 at that commit) | Public domain ("Crediting the authors is unnecessary", naturalearthdata.com/about/terms-of-use) | 2026-11-19 | S2 route map: `scripts/coast.mjs` clips, projects (plate carrée) and simplifies it into `src/art/coast.ts` (generated, ≈ 3 KB gz) |
| Open Peeps (Pablo Stanley) | https://www.openpeeps.com | library as downloaded | CC0 ("copy, modify, distribute, remix … even for commercial purposes, without asking permission") | 2026-11-18 (site text) | P3 / D-V5 portraits, only if used |
| Open Doodles (Pablo Stanley) | https://www.opendoodles.com | library as downloaded | CC0 ("copy, edit, remix, share, or redraw these images for any purpose without restriction"; "No need to credit"; the about page states no pack/redistribution limit, so the third-party "no packs" note in v6 §1 is not the author's licence) | 2026-11-18 (opendoodles.com/about) | P3 empty states, only if used |

## Checked and not used

| What | Licence | Why not |
|---|---|---|
| Kenney (kenney.nl) packs | CC0 | T0 found no fitting pack: the transport kits with ships/cars (Watercraft Kit, Car Kit, Pirate Kit) are 3D (D4: no 3D); Pirate Pack is 2D but sailing ships, not container ships; Isometric Tiles Vehicles is isometric, which does not match the flat side-view harbour; no pack shows container ships, trucks or containers, and no pack page lists SVG/vector files (downloads are signed links, not checked). The harbour (S1/T7) is drawn by hand. |
| unDraw | free, but forbids distributing assets "in packs" and AI training | a public repo's art folder is close to a pack |
| Lottie, Rive, PixiJS, Three.js, anime.js, Motion | MIT/ISC | not needed (ui-ux-v6 §8, D2–D4) |

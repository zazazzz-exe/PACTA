# PACTA brand mark

- `pacta-logo-source.png`: the owner-supplied mark (transparent, 1536x1024). Source of truth; never edit its geometry.
- `pacta-mark-1024.png`: the same pixels, cropped to the mark and padded square.
- `preview-*.png`: the mark with and without the glow on the app's dark and light canvases.

## Glow layers (frontend/public/brand)
The neon glow is separate from the mark so it can be turned on or off on its own (`<PactaLogo glow={false} />`):
- `pacta-mark.png`: the mark only, unchanged.
- `pacta-mark-glow.png`: drawn behind the mark on a 1.8x canvas (CSS `-inset-[40%]`). Soft electric-blue outer glow, cyan light on the upper-right curves, gentle violet ambient light lower-left, and a faint radial halo. Transparent background.
- `pacta-mark-rim.png`: faint luminous edge highlight, clipped inside the mark, drawn on top.

In light mode the glow and rim render at reduced opacity (`index.css`). The layers are static, so nothing animates.

App icons (`frontend/public/pacta-icon.png` -> `npx pwa-assets-generator` in `frontend/`) use the glowing mark on `#0D1018`, sized inside the maskable safe zone.

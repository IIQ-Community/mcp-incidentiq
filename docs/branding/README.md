# IIQ Community — Brand Assets

Visual identity for the [IIQ Community](https://github.com/IIQ-Community/) organization and its
projects. The mark is a **bridge** — two teal towers ("ii") under a violet span with an amber
keystone — over an open book: *bridge districts, share knowledge, build together.*

> **Independent community project.** Not affiliated with, sponsored by, or endorsed by IncidentIQ
> Inc. Original community marks — do not substitute IncidentIQ's official logo or brand assets.
>
> See [`PROVENANCE.md`](./PROVENANCE.md) for the full source lineage of every file.

## Palette

| Role | Hex |
|------|-----|
| Primary — teal | `#14B8A6` |
| Secondary — violet | `#636AF1` |
| Accent — amber | `#FFC107` |
| Neutral — deep slate | `#1F2233` |

Light contexts use the slate book; dark contexts recolor book + dashed arc to `#E8EBF5`.

## Files

| File | Use |
|------|-----|
| `iiq-bridge-hero.svg` · `iiq-bridge-hero-dark.svg` | **Hero** — full bridge, for large/banner contexts |
| `iiq-mark.svg` · `iiq-mark-dark.svg` | **Standard mark** — README header, general use; simplified for ≤48px |
| `iiq-avatar.svg` · `iiq-avatar-512.png` · `iiq-avatar-460.png` | **GitHub org avatar** — mark on a solid slate tile (works on both themes) |
| `iiq-favicon.svg` · `favicon-16/32/48.png` | **Favicon** — browser tab / bookmarks |
| `iiq-lockup-horizontal.svg` (+ `-dark`) | **Horizontal lockup** — mark + "IIQ Community" |
| `iiq-lockup-stacked.svg` (+ `-dark`) | **Stacked lockup** |
| `iiq-social-card.svg` · `iiq-social-card.png` | **Social preview** (1280×640) |

## How to apply

- **Org avatar:** Organization → **Settings → Profile → Profile picture** → upload `iiq-avatar-512.png`.
  (GitHub org avatars are one raster image shown on both themes — hence the solid slate tile.)
- **Repo social preview:** repo → **Settings → General → Social preview** → upload `iiq-social-card.png`.
- **README logo:** wired in the root `README.md` via a `<picture>` block (`iiq-mark.svg` / `iiq-mark-dark.svg`).
- **Favicon:** ship `iiq-favicon.svg` (modern browsers) with `favicon-32.png` / `favicon-16.png` fallbacks.
  Note: the book detail softens at a true 16px tab — acceptable; a book-less variant can be cut if a
  razor-sharp 16px is ever required.

## Typography

Wordmarks are set in **Inter** (SIL Open Font License) — **IIQ ExtraBold**, **Community Medium** —
and **outlined to vector paths**, so the lockups and social card render identically everywhere with
no font dependency. See [`PROVENANCE.md`](./PROVENANCE.md).

## Regenerating

All SVGs and PNGs are produced deterministically from `context/iiq-community/_gen.py` (untracked).
It needs the Inter variable TTF (OFL) to outline the wordmarks:

```bash
curl -fsSL "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf" -o /tmp/Inter-var.ttf
uv run --no-project --with cairosvg --with pillow --with fonttools python context/iiq-community/_gen.py
```

Original explorations and the ChatGPT source artwork are kept (untracked) in `context/iiq-community/`.

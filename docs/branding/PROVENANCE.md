# IIQ Community Brand Assets — Provenance

Lineage record for every brand asset in this directory. The **icon artwork is
ChatGPT-generated** (Concept C, "District Tech Bridge"); the contribution from Claude Code is
**vector editing** of that artwork (element removal, recolor, re-centering, the amber keystone) plus
all **rendering, exporting, and wordmark typesetting**. Nothing here is traced from raster or redrawn
from scratch.

> **Independent community project.** Not affiliated with, sponsored by, or endorsed by IncidentIQ
> Inc. The earlier magnifier-based exploration was discarded specifically because it collided with
> IncidentIQ's magnifying-glass-as-Q brand device; this bridge mark shares none of that.

## Root sources

| ID | Source file (in `context/iiq-community/`, untracked) | Origin |
|----|------------------------------------------------------|--------|
| **S1** | `iiq_community_concept_c_icon.svg` | ChatGPT — full bridge vector (master artwork) |
| **S2** | `iiq_community_concept_c_avatar.svg` | ChatGPT — bridge in framed square + "IIQ" text |
| **S3a** | `ChatGPT Image …02_48_33 PM (2).png` | ChatGPT — horizontal "IIQ Community" lockup + tagline (raster) |
| **S3b** | `ChatGPT Image …02_48_33 PM (3).png` | ChatGPT — stacked lockup (raster) |
| **S4** | `ChatGPT Image …02_43_17 PM.png` | ChatGPT — palette sheet (hex values) |
| **S5** | `test_avatar_final.svg` | Claude Code edit of **S1** (the locked mark) |

## Per-asset provenance

| Asset (this dir) | Derives from | Edits / transforms | Authorship |
|------------------|--------------|--------------------|------------|
| `iiq-bridge-hero.svg` | **S1** | Re-centered into 512² viewBox, transparent bg; artwork otherwise unchanged | ChatGPT design; reframing by Claude |
| `iiq-bridge-hero-dark.svg` | **S1** | Recolor slate book + dashed arc → light (`#E8EBF5`) for dark backgrounds | ChatGPT design + recolor by Claude |
| `iiq-mark.svg` | **S5 → S1** | From S1: removed 3 network dots, dashed arc, 5 railings; added amber keystone; re-centered; book stroke 12→13 | ChatGPT paths + vector edits by Claude |
| `iiq-mark-dark.svg` | **S5** | Recolor book → light for dark backgrounds | + recolor by Claude |
| `iiq-favicon.svg` | **S5** | Same as `iiq-mark.svg` (named for clarity) | ChatGPT paths + edits by Claude |
| `iiq-avatar.svg` + `iiq-avatar-512/460.png` | **S5** | Mark on a solid slate tile (dark-mark variant); PNG rendered via cairosvg | mark = ChatGPT/Claude; tile + render = Claude |
| `favicon-16/32/48.png` | **S5** | Exported at icon sizes via cairosvg | mark = ChatGPT/Claude; export = Claude |
| `iiq-lockup-horizontal.svg` (+ `-dark`) | icon = **S5**; layout ref = **S3a** | Icon + "IIQ Community" set in **Inter**, **outlined to vector paths** | icon = ChatGPT/Claude; type + layout = Claude |
| `iiq-lockup-stacked.svg` (+ `-dark`) | icon = **S5**; layout ref = **S3b** | Same, stacked | icon = ChatGPT/Claude; type + layout = Claude |
| `iiq-social-card.svg` + `.png` | icon = **S5** | Icon + outlined Inter wordmark + slate background/layout, rendered to 1280×640 | icon = ChatGPT/Claude; layout/render = Claude |

## Wordmark: Inter, outlined to vector paths

ChatGPT confirmed its rasters have **no specific font** (the text was model-painted) and its own SVGs
use a `DejaVu Sans → Arial → sans-serif` stack — so there is no exact source font to match. The
**"IIQ Community" wordmark is set in [Inter](https://fonts.google.com/specimen/Inter)** (SIL Open
Font License) — **IIQ ExtraBold (800), Community Medium (500)**, subtitle Inter Regular (400) — and
**converted to vector outlines (`<path>`)** with fontTools. The lockups and social card therefore
carry **no font dependency** and render identically on any system. Inter was sourced from Google
Fonts (OFL) solely to extract glyph outlines; no font file is shipped in this directory.

## Palette (from S4)

| Teal `#14B8A6` · Violet `#636AF1` · Amber `#FFC107` · Deep Slate `#1F2233` |
|---|

Light contexts use the slate book; dark contexts recolor book + dashed arc to `#E8EBF5`.

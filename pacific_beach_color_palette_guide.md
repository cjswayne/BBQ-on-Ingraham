# Pacific Beach Color Palette Guide

A grounded color system inspired by San Diego’s Pacific Beach: sun-faded tones, cool Pacific water, and lightly worn coastal textures.

---

## Core Colors

| Name | Hex | Usage |
|------|-----|------|
| Ocean Blue | #2E6F95 | Primary actions, headers, navigation |
| Seafoam Fade | #7FB7BE | Secondary UI, subtle highlights |
| Sandstone Beige | #E6D3A3 | Backgrounds, base layers |
| Sunset Coral | #F08A7E | Calls to action, highlights |
| Boardwalk Lavender | #C6B7E2 | Decorative accents, secondary highlights |
| Washed Palm Green | #6F8F72 | Supporting UI, icons |
| Weathered Driftwood | #8A7F73 | Text, borders, neutral UI |
| Neon Accent | #FF4F81 | Limited emphasis, nightlife vibe |

---

## Color Roles

### Primary
- Ocean Blue

### Secondary
- Seafoam Fade
- Washed Palm Green

### Backgrounds
- Sandstone Beige (default)
- Weathered Driftwood (alternative)

### Accents
- Sunset Coral
- Boardwalk Lavender

### High Emphasis
- Neon Accent (use sparingly)

---

## Example Usage

### UI Layout
- Page background: Sandstone Beige
- Header/nav: Ocean Blue
- Buttons: Sunset Coral
- Secondary buttons: Seafoam Fade
- Text: Weathered Driftwood

### Cards / Components
- Card background: #FFFFFF or Sandstone Beige
- Borders: Weathered Driftwood (low opacity)
- Hover states: Slightly darkened Seafoam or Coral

---

## Accessibility Notes

- Ocean Blue on Sandstone Beige provides readable contrast for most UI text
- Driftwood should be tested for smaller text sizes
- Neon Accent should not be used for body text

---

## Optional Tailwind Config

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        pb: {
          ocean: '#2E6F95',
          seafoam: '#7FB7BE',
          sand: '#E6D3A3',
          coral: '#F08A7E',
          lavender: '#C6B7E2',
          palm: '#6F8F72',
          driftwood: '#8A7F73',
          neon: '#FF4F81'
        }
      }
    }
  }
}
```

---

## Notes / Assumptions

- Colors are intentionally muted to reflect actual PB conditions (marine layer, sun fade)
- This palette avoids overly saturated “tropical” tones that don’t match the local environment
- Adjust brightness/contrast depending on your product context

---

You’ll want to validate contrast ratios against your specific UI components and typography choices before finalizing.


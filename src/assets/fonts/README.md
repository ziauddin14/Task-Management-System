# Jameel Noori Nastaleeq (pending)

The client has not yet provided the actual `.woff2` font file (carried-forward gap, first flagged
in the backend's Phase 8 report). Once received, drop it here as:

```
JameelNooriNastaleeq.woff2
```

`src/styles/fonts.css` already declares the `@font-face` rule pointing at this exact path — no
code changes will be needed, the font will simply start being used the moment the file exists.
Until then, the app falls back to the documented stack (Noto Nastaliq Urdu, Noto Sans Arabic,
sans-serif) set in `tailwind.config.js`.

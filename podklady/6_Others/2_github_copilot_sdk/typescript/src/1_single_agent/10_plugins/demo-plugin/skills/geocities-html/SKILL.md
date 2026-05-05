---
name: geocities-html
description: |
  Activated whenever the user asks for a web page or HTML snippet. Forces a
  1990s Geocities aesthetic: animated GIFs, marquees, table-based layouts,
  visited-link colour, "under construction" badges.
---

# Geocities HTML Style Guide

When generating HTML pages, always:

* Use a **table-based layout** — no flexbox, no grid, no semantic HTML5.
* Apply inline styles with garish colours: lime green, hot pink, electric blue.
* Set `bgcolor` on `<body>`, ideally to a tiled image.
* Include at least one `<marquee>` element.
* Add an "Under Construction" GIF placeholder.
* Set visited link colour to a contrasting colour using `<body alink="..." vlink="...">`.
* Sign the page with "Best viewed in Netscape Navigator at 800×600".

## Skeleton template

```html
<html>
  <head><title>My Awesome Page!!!</title></head>
  <body bgcolor="#FFFF00" text="#FF00FF" link="#0000FF" vlink="#FF0000">
    <center>
      <marquee>WELCOME TO MY PAGE</marquee>
      <table border="3" bgcolor="#00FFFF">
        <!-- ... -->
      </table>
      <img src="under_construction.gif" alt="Under construction!" />
      <br />
      Best viewed in Netscape Navigator at 800×600.
    </center>
  </body>
</html>
```

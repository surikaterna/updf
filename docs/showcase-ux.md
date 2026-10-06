# Showcase UX rationale and acceptance scope

The showcase source is private/unreleased; local build/test results are not a
deployment or WCAG conformance claim. Prior dated audit/delivery evidence remains
historical. JPEG delivery adds a runnable Node example, not a showcase redesign;
publishing remains deferred pending the docs sweep and separate authorization.

## Reference-informed decisions

- [W3C: status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
  informs the polite status region without moving focus on live edits. Per-input
  pending text stays outside that region to avoid announcing every keystroke.
  Invalid fields have associated errors; a previous successful PDF stays visibly
  labeled and downloadable while a new result is pending or rejected.
- [W3C: reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
  informs the narrow-screen navigation → inputs → preview → source order. Desktop
  pairs inputs and preview to reduce switching; mobile stacks them. Source code
  remains independently scrollable, and a canvas preview is not a semantic text
  alternative to the PDF. These choices do not prove accessibility of either.
- [MDN: native details](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details)
  informs the keyboard-operable source disclosure, closed initially to keep the
  task visible. It shows actual imported source plus committed-result arguments,
  not substituted pseudo-code or an editable/evaluated program.

## Bounded behavior and evidence

Live edits debounce for 300 ms; explicit Generate remains available. Preview,
download and displayed arguments commit together; pending or invalid edits do not
silently relabel old bytes as a new result. Reset affects the selected demo.
Grouped example navigation and on-demand adapters preserve the core-first entry.
Rendering is local with no input uploads or rendering server; loading the site
and following external links still involve ordinary network requests.

The vector brand letterhead uses the same original MIT-licensed Northstar Studio
sample SVG in the UI and PDF. Header size is bounded to 32–80 PDF points with
three palettes; the card mark remains 56 points. This is not an official corporate
identity or arbitrary SVG upload support. This demo remains vector-only; optional
[JPEG library support](jpeg-images.md) does not change it or add a layout Image API.

Existing acceptance tests are in `tests/showcase/ux.test.ts` (desktop geometry,
keyboard disclosure, stable focus, result/argument consistency, associated errors,
320 px stacking and enlarged text) and `tests/showcase/branding.test.ts` (sample
vector output and bounded controls). Other showcase tests cover preview failures,
responsive output and adapter boundaries. Run after building the showcase:

```sh
npm run test:showcase
```

Browser automation and screenshots are bounded evidence, not a comprehensive
screen-reader, browser, zoom or WCAG audit. Independent final audit must review
the actual delivered scope and these current docs before further authorized delivery.

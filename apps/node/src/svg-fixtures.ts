// Original unbranded fixtures, not copied customer/CMR logo/signature artwork.
export const logoLikeSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="320px" height="200px" viewBox="0 0 160 100">
<defs><style>.paper {fill:#eeeeee;stroke:none} .ink {fill:none;stroke:#223344;stroke-width:2;stroke-linecap:round;stroke-linejoin:round} .accent {fill:rgba(255,0,0,0.6);stroke:none}</style></defs>
<title>Unbranded geometry fixture</title><desc>All artwork is synthetic.</desc>
<rect class="paper" x="4" y="4" width="152" height="92" rx="6"/>
<g transform="translate(12 12)"><circle class="accent" cx="14" cy="16" r="10"/>
<ellipse cx="50" cy="16" rx="14" ry="8" fill="green" stroke="none"/>
<rect x="80" y="6" width="42" height="20" rx="5" ry="7" fill="blue"/>
<polyline class="ink" points="0,45 10,35 20,47 30,37 40,45"/>
<polygon points="58,35 72,45 58,55" fill="#ff8800"/>
<line class="ink" x1="85" y1="40" x2="120" y2="50"/>
<g transform="rotate(8 68 65) skewX(5)"><path class="ink" d="M2 66 C12 48 20 82 30 66 S48 48 56 66 Q64 82 72 66 T88 66 A10 7 25 0 1 108 66"/></g>
</g></svg>`;

export const signatureLikeSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="10 20 160 100" preserveAspectRatio="xMidYMid meet">
<style>.a{fill:none;stroke:black;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round} .b{stroke:blue}</style>
<path class="b a" transform="translate(12,28) scale(.9)" d="M0 52c12-45 26-45 18 0s20-24 26-12q8 18 16-2t18 1a10 5 15 0 1 14 0M6 66h114"/>
<g stroke="red" stroke-width="2" fill="none" transform="matrix(1 .08 -.12 1 0 0)"><path d="M115 74 L146 70 L150 77" stroke-dasharray="3 2 1" stroke-dashoffset="-1"/></g>
</svg>`;

export const aspectSVG = (
  preserve: string,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="10 20 120 60" preserveAspectRatio="${preserve}">
<rect x="10" y="20" width="120" height="60" fill="blue"/><circle cx="70" cy="50" r="20" fill="rgba(255,0,0,.5)"/>
</svg>`;
export const quotedNoneSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" stroke="blue"><style>.legacy {fill:#eeeeee;stroke:'none';}</style><rect class="legacy" x="20" y="20" width="60" height="60"/></svg>`;

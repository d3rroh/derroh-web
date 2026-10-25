// Checks that every inline <script> and on*="" handler in the built site is
// allowed by a sha256 hash in the CSP, so editing one can't silently break
// the page in production. Run in the Dockerfile's `assets` stage:
//   node check_csp.js <security-headers.conf> <site-dir>
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const [confPath, siteDir] = process.argv.slice(2);
if (!confPath || !siteDir) {
  console.error('usage: check_csp.js <security-headers.conf> <site-dir>');
  process.exit(2);
}

const csp = fs.readFileSync(confPath, 'utf8').match(/Content-Security-Policy "([^"]+)"/);
if (!csp) {
  console.error(`check_csp: no Content-Security-Policy in ${confPath}`);
  process.exit(1);
}
const scriptSrc = (csp[1].match(/script-src ([^;]+)/) || ['', ''])[1];
const allowed = new Set([...scriptSrc.matchAll(/'sha256-([^']+)'/g)].map(m => m[1]));

const sha256 = s => crypto.createHash('sha256').update(s, 'utf8').digest('base64');

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return htmlFiles(p);
    return e.name.endsWith('.html') ? [p] : [];
  });
}

let missing = 0;
for (const file of htmlFiles(siteDir)) {
  const html = fs.readFileSync(file, 'utf8');
  const found = [];
  for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1] || '';
    // External scripts and data blocks (JSON-LD) aren't covered by hashes.
    if (/\ssrc=/.test(attrs) || /type="application\/(ld\+)?json"/.test(attrs)) continue;
    found.push(['inline <script>', m[2]]);
  }
  for (const m of html.matchAll(/\son[a-z]+="([^"]*)"/g)) found.push(['handler', m[1]]);

  for (const [kind, code] of found) {
    const h = sha256(code);
    if (!allowed.has(h)) {
      missing++;
      console.error(`check_csp: ${path.relative(siteDir, file)}: ${kind} not in CSP script-src, add 'sha256-${h}'`);
    }
  }
}
if (missing) process.exit(1);
console.log('check_csp: all inline scripts and handlers are allowed by the CSP');

// Exercise the actual generated theme's index construction and query logic.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const site = path.resolve(process.argv[2] || '_site');
const lunr = require(path.join(site, 'assets/js/vendor/lunr.min.js'));
const script = fs.readFileSync(path.join(site, 'assets/js/just-the-docs.js'), 'utf8');
const data = fs.readFileSync(path.join(site, 'assets/js/search-data.json'), 'utf8');
const start = script.indexOf('function initSearch()');
const end = script.indexOf('function searchLoaded(', start);
assert(start >= 0 && end > start, 'Theme search initialization changed; review the test');
let index;
let docs;
class Request {
  open() {}
  send() {
    this.status = 200;
    this.responseText = data;
    this.onload();
  }
}
const context = { lunr, XMLHttpRequest: Request, console,
  searchLoaded(actualIndex, actualDocs) { index = actualIndex; docs = actualDocs; } };
vm.runInNewContext(script.slice(start, end) + '\ninitSearch();', context);
assert(index && docs, 'Generated search must initialize');
const queryStart = script.indexOf('var results = index.query(');
const queryEnd = script.indexOf('if ((results.length == 0)', queryStart);
assert(queryStart >= 0 && queryEnd > queryStart);
for (const [query, expected] of [
  ['RAG', '检索增强生成'],
  ['Reasoning', '推理模型'],
]) {
  const results = vm.runInNewContext(
    '(function () {' + script.slice(queryStart, queryEnd) + 'return results;})()',
    { index, lunr, input: query },
  );
  assert(results.length > 0, `No results for ${query}`);
  assert(results.slice(0, 10).some(result => docs[result.ref].title.includes(expected)),
    `${query} must find ${expected} near the top`);
}
console.log('PASS: unmodified official Lunr search finds English technical terms');

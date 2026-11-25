// Keep Chinese text searchable without adding a client-side dependency.
if (!lunr.tokenizer.supportsHan) {
  var originalTokenizer = lunr.tokenizer;
  lunr.tokenizer = function (value, metadata) {
    if (typeof value !== 'string') return originalTokenizer(value, metadata);
    var tokens = [];
    var pattern = /[\u3400-\u9fff]|[a-z0-9_]+/g;
    var text = value.toLowerCase();
    var match;
    while ((match = pattern.exec(text)) !== null) {
      tokens.push(new lunr.Token(match[0], Object.assign({}, metadata, {
        position: [match.index, match[0].length],
        index: tokens.length
      })));
    }
    return tokens;
  };
  lunr.tokenizer.supportsHan = true;
}
this.tokenizer = lunr.tokenizer;
// The default English trimmer would otherwise discard all Han tokens.
this.pipeline.remove(lunr.trimmer);
this.searchPipeline.remove(lunr.trimmer);

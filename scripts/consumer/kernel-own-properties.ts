// Run only in isolated child consumers; never pollute the parallel test runner.
export const ownPropertyRuntime = `
let reads = 0;
const sentinel = new Error('inherited getter executed');
function polluted(key, descriptor, check) {
  const previous = Object.getOwnPropertyDescriptor(Object.prototype, key);
  Object.defineProperty(Object.prototype, key, { configurable: true, ...descriptor });
  try { check(); }
  finally {
    if (previous) Object.defineProperty(Object.prototype, key, previous);
    else delete Object.prototype[key];
  }
}
function rejected(resolve, input, code, path, message, ErrorType) {
  assert.throws(() => resolve(input, '/host'), error => {
    assert.ok(error instanceof ErrorType);
    const diagnostic = error.diagnostics ? error.diagnostics[0] : error;
    assert.deepEqual({code: diagnostic.code, path: diagnostic.path, message: diagnostic.message},
      {code, path: '/host' + path, message});
    return true;
  });
}
function checkArrayDescriptors(resolve, ErrorType) {
  const results = [];
  for (const throws of [false, true]) {
    for (const limited of [false, true]) {
      let getterReads = 0;
      const tracks = limited ? [1, 1] : [1];
      const descriptor = Object.assign(Object.create(null), {
        enumerable: true, configurable: true,
        get() { getterReads++; if (throws) throw sentinel; return 1; },
      });
      Object.defineProperty(tracks, '0', descriptor);
      const input = {availableWidth:10, tracks, maxTracks: limited ? 1 : 10};
      let error;
      polluted('value', {value: 1}, () => {
        try { resolve(input, '/widths'); } catch (caught) { error = caught; }
      });
      results.push({error, getterReads, limited, throws});
    }
  }
  const input = {availableWidth:10, tracks:[1, {weight:1}]};
  const expected = resolve(input);
  let actual;
  let dataError;
  polluted('value', {value: 1}, () => {
    try { actual = resolve(input); } catch (caught) { dataError = caught; }
  });
  assert.equal(dataError, undefined);
  assert.deepEqual(actual, expected);
  for (const {error, getterReads, limited, throws} of results) {
    assert.equal(getterReads, 0, 'array getter must remain unread: ' + JSON.stringify({limited, throws}));
    assert.ok(error instanceof ErrorType);
    const diagnostic = error.diagnostics ? error.diagnostics[0] : error;
    assert.deepEqual({code: diagnostic.code, path: diagnostic.path, message: diagnostic.message}, limited
      ? {code:'LIMIT', path:'/widths/tracks', message:'Maximum length is 1'}
      : {code:'TYPE', path:'/widths/tracks/0', message:'Dense enumerable data arrays only'});
  }
}
function checkOwnProperties(resolve, ErrorType) {
  checkArrayDescriptors(resolve, ErrorType);
  const required = [
    ['availableWidth', 10, {tracks:[1]}, 'GEOMETRY', '/availableWidth', 'Expected a finite number'],
    ['tracks', [1], {availableWidth:10}, 'TYPE', '/tracks', 'Expected an ordinary array'],
    ['weight', 1, {availableWidth:10, tracks:[{}]}, 'GEOMETRY', '/tracks/0/weight', 'Expected a finite number'],
  ];
  const optional = [
    ['gap', 9, {availableWidth:10, tracks:[1,1]}],
    ['maxTracks', 0, {availableWidth:10, tracks:[1]}],
    ['min', 11, {availableWidth:10, tracks:[{weight:1}]}],
    ['max', 1, {availableWidth:10, tracks:[{weight:1}]}],
  ];
  for (const [key, value, input, code, path, message] of required) {
    for (const descriptor of [
      {value}, {get() { reads++; return value; }}, {get() { reads++; throw sentinel; }},
    ]) polluted(key, descriptor, () => rejected(resolve, input, code, path, message, ErrorType));
  }
  for (const [key, value, input] of optional) {
    const expected = resolve(input);
    for (const descriptor of [
      {value}, {get() { reads++; return value; }}, {get() { reads++; throw sentinel; }},
    ]) polluted(key, descriptor, () => assert.deepEqual(resolve(input), expected));
  }
  for (const key of ['availableWidth', 'tracks', 'gap', 'maxTracks', 'weight', 'min', 'max']) {
    const input = {availableWidth:10, tracks:[{weight:1}]};
    const target = ['weight', 'min', 'max'].includes(key) ? input.tracks[0] : input;
    Object.defineProperty(target, key, {enumerable:true, get() { reads++; throw sentinel; }});
    const path = (target === input ? '/' : '/tracks/0/') + key;
    rejected(resolve, input, 'TYPE', path, 'Expected enumerable own data property', ErrorType);
  }
  assert.equal(reads, 0);
  const failure = new Error('arbitrary host failure');
  const proxy = new Proxy({}, {getPrototypeOf() { throw failure; }});
  assert.throws(() => resolve(proxy), error => error === failure);
}
checkOwnProperties(resolveWidths, LayoutInputError);
`;

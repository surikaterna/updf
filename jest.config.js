/** @type {import('jest').Config} */
module.exports = {
  roots: ['<rootDir>/test'],
  transform: {
    '^.+\\.(t|j)sx?$': ['es-jest']
  },
  testRegex: '.*\.spec\.[tj]s$',
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node']
};

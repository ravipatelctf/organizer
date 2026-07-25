// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.config.js is loaded via require by jest itself
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const config = {
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
};

module.exports = createJestConfig(config);

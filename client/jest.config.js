/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'], // or .js
  moduleNameMapper: {
    // CSS & Tailwind class stubs
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    // Static assets
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/test/test-file-stub.js',
    // If you alias paths in tsconfig.json/jsconfig.json, mirror them here
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/main.*',
    '!src/index.*',
    '!src/**/*.d.ts'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
};

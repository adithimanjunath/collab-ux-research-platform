const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    video: true,
    screenshotOnRunFailure: true,
    supportFile: 'cypress/support/e2e.js',
    defaultCommandTimeout: 8000,
    viewportWidth: 1280,
    viewportHeight: 800,
  },
})

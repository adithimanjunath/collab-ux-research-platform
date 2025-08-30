// You can put global Cypress setup here
// Example: seed a fake auth user before app loads (if you add a test hook)
Cypress.on('window:before:load', (win) => {
  // Uncomment once you add a client-side test hook reading this value
  // win.__TEST_AUTH__ = { uid: 'u1', email: 'u@example.com', displayName: 'E2E User', getIdToken: ()=>'tok-123' }
})

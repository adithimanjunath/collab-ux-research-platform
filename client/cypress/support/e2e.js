import './commands';

// Cache an auth session once per run
before(() => {
  cy.session('auth-session', () => {
    cy.login('cypress-u1');
  });
});

beforeEach(() => {
  cy.session('auth-session', () => {
    cy.login('cypress-u1');
  });
});


// Ensure a stubbed user is injected before any page load if programmatic login isn't used
Cypress.on('window:before:load', (win) => {
  if (!win.__TEST_AUTH__) {
    win.__TEST_AUTH__ = {
      uid: 'cypress-u1',
      email: 'cypress-u1@example.com',
      displayName: 'E2E User',
      getIdToken: () => 'tok-123',
    };
  }
});

export const API_BASE = Cypress.env('API_BASE') || 'http://localhost:5050';

Cypress.Commands.add('login', (uid = 'cypress-u1') => {
  const secret = Cypress.env('TEST_LOGIN_SECRET') || 'dev-secret';
  return cy.request({
    method: 'POST',
    url: `${API_BASE}/api/test/login`,
    headers: { 'X-Test-Secret': secret },
    body: { uid },
    failOnStatusCode: false,
  }).then((res) => {
    // Fallback to stubbed auth if endpoint is unavailable (404/403/500)
    if (!res || !res.body || !res.body.customToken) {
      cy.visit('/', {
        onBeforeLoad(win) {
          win.__TEST_AUTH__ = {
            uid,
            email: `${uid}@example.com`,
            displayName: 'E2E User',
            getIdToken: () => 'tok-123',
          };
        },
        failOnStatusCode: false,
      });
      return;
    }

    const token = res.body.customToken;
    cy.visit('/', { failOnStatusCode: false });
    return cy.window().then((w) => {
      if (typeof w.__signInWithCustomToken === 'function') {
        return w.__signInWithCustomToken(token);
      }
      // If helper isn't present for any reason, fallback to stubbed auth
      w.__TEST_AUTH__ = { uid, email: `${uid}@example.com`, displayName: 'E2E User', getIdToken: () => 'tok-123' };
    });
  });
});

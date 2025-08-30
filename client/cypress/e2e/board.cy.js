describe('Board page (programmatic login)', () => {
  const user = { uid: 'u1', email: 'e2e@example.com', displayName: 'E2E User' };

  it('shows empty state when no notes, and overlay on join_granted (others present)', () => {
    cy.intercept('GET', /\/api\/notes\?boardId=.*/, []).as('getNotes');

    cy.visit('/e2e-board');

    cy.wait('@getNotes');
    cy.contains(/No notes yet/i).should('be.visible');

    // Ensure mock socket is available, then dispatch a server event
    cy.window().its('__mockSocket').should('exist');
    cy.window().then((w) => { w.__mockSocket.__dispatch('join_granted', { othersCount: 2 }); });

    cy.get('[data-testid="board-gate-overlay"]').should('be.visible');
  });

  it('does not show overlay for first user (othersCount 0)', () => {
    cy.intercept('GET', /\/api\/notes\?boardId=.*/, []).as('getNotes');
    cy.visit('/e2e-board2');
    cy.wait('@getNotes');

    cy.window().then((w) => { w.__mockSocket.__dispatch('join_granted', { othersCount: 0 }); });
    cy.get('[data-testid="board-gate-overlay"]').should('not.exist');
  });
});

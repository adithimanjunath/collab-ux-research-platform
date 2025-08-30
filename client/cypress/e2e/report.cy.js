describe('Report page (programmatic login + intercept analyze)', () => {
  const user = { uid: 'u1', email: 'e2e@example.com', displayName: 'E2E User' };

  it('submits text and shows results modal', () => {
    cy.intercept('POST', /\/api\/ux\/analyze$/, {
      statusCode: 200,
      body: {
        top_insight: 'Users love the design but report slowness on mobile',
        pie_data: [{ name: 'Usability', value: 2 }],
        insights: { Usability: ['Confusing menu'] },
        positive_highlights: ['Clean and modern UI'],
        delight_distribution: [{ name: 'Visual Design', value: 1 }],
      }
    }).as('analyze');

    cy.visit('/report');

    cy.get('textarea[placeholder*="Paste interview text here"]').type('Looks great, but the menu is confusing.');
    cy.contains('button', /^Analyze$/).click();

    cy.wait('@analyze');
    cy.contains('Analysis Results').should('be.visible');
  });
});

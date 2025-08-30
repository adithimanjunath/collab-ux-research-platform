describe('Homepage', () => {
  it('loads welcome screen', () => {
    cy.visit('/')
    cy.contains(/collaborative ux research platform/i).should('be.visible')
    cy.contains(/sign in with google/i).should('be.visible')
  })
})

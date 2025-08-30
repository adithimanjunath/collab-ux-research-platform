describe('Backend docs', () => {
  it('responds to health and serves Swagger UI', () => {
    cy.request('http://localhost:5050/health').its('status').should('eq', 200)
    cy.request('http://localhost:5050/openapi.yaml').its('status').should('eq', 200)
  })
})

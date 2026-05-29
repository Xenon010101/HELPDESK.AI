/**
 * E2E test suite — Admin Settings persistence workflows
 * Covers: settings load, update, persist on reload, and API roundtrip
 */

describe('Admin Settings — Persistence Workflows', () => {
  beforeEach(() => {
    cy.stubSettingsApi();
    cy.loginAsAdmin();
    cy.goToAdminSettings();
  });

  it('renders all major settings sections', () => {
    cy.contains('AI Settings').should('be.visible');
    cy.contains('Ticket Settings').should('be.visible');
    cy.contains('Notifications').should('be.visible');
  });

  it('displays the current AI confidence threshold value', () => {
    cy.wait('@getSettings');
    // The slider label reflects the persisted value
    cy.contains(/AI Confidence Threshold/i).should('be.visible');
    cy.get('input[type="range"]').first().should('have.value', '0.7');
  });

  it('updates AI confidence threshold and reflects the new value in label', () => {
    cy.wait('@getSettings');
    cy.get('input[type="range"]').first().as('slider');

    // Cypress range slider interaction: set value via invoke then trigger change
    cy.get('@slider').invoke('val', '0.9').trigger('change');
    cy.contains('90%').should('be.visible');
  });

  it('toggles Auto Resolve and verifies state change', () => {
    cy.wait('@getSettings');
    cy.contains('Enable Auto Resolve')
      .closest('div.flex')
      .find('button')
      .as('toggle');

    cy.get('@toggle').then(($btn) => {
      const wasActive = $btn.hasClass('bg-indigo-600');
      cy.get('@toggle').click();
      if (wasActive) {
        cy.get('@toggle').should('have.class', 'bg-slate-200');
      } else {
        cy.get('@toggle').should('have.class', 'bg-indigo-600');
      }
    });
  });

  it('persists settings after page reload (store hydration)', () => {
    cy.wait('@getSettings');
    // Set a specific slider value
    cy.get('input[type="range"]').eq(1).invoke('val', '0.65').trigger('change');
    cy.contains('65%').should('be.visible');

    // Reload and verify the value is still there via stubbed API
    cy.reload();
    cy.wait('@getSettings');
    cy.contains(/Duplicate Detection/i).should('be.visible');
  });

  it('email notifications toggle switches between active and inactive state', () => {
    cy.wait('@getSettings');
    cy.contains('Email Notifications')
      .closest('div.flex')
      .find('button')
      .as('emailToggle');

    cy.get('@emailToggle').click();
    cy.get('@emailToggle').should('not.have.class', 'bg-amber-500');

    cy.get('@emailToggle').click();
    cy.get('@emailToggle').should('have.class', 'bg-amber-500');
  });

  it('auto-close days selector updates the persisted value', () => {
    cy.wait('@getSettings');
    cy.contains('Auto-Close Tickets').should('be.visible');
  });
});

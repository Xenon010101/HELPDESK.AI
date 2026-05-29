// ---------------------------------------------------------------------------
// Custom Cypress commands for HELPDESK.AI test suites
// ---------------------------------------------------------------------------

/**
 * Log in as an admin using the Supabase-backed login form.
 * Credentials default to the admin fixture but can be overridden.
 */
Cypress.Commands.add('loginAsAdmin', (email, password) => {
  cy.fixture('admin').then((admin) => {
    const adminEmail = email || admin.email;
    const adminPassword = password || admin.password;

    cy.visit('/login');
    cy.get('[data-testid="email-input"], input[type="email"]').first().type(adminEmail);
    cy.get('[data-testid="password-input"], input[type="password"]').first().type(adminPassword);
    cy.get('[data-testid="login-button"], button[type="submit"]').first().click();
    // Wait for navigation away from login page
    cy.url({ timeout: 10000 }).should('not.include', '/login');
  });
});

/**
 * Navigate to the admin settings page and wait for it to load.
 */
Cypress.Commands.add('goToAdminSettings', () => {
  cy.visit('/admin/settings');
  cy.contains('Settings', { timeout: 8000 }).should('be.visible');
});

/**
 * Intercept and stub a GET/POST to the settings API endpoint.
 */
Cypress.Commands.add('stubSettingsApi', (overrides = {}) => {
  const defaultSettings = {
    aiConfidenceThreshold: 0.7,
    duplicateSensitivity: 0.85,
    enableAutoResolve: true,
    autoCloseDays: 7,
    emailNotifications: true,
    adminAlerts: false,
    ...overrides,
  };

  cy.intercept('GET', '**/company_settings**', { body: defaultSettings }).as('getSettings');
  cy.intercept('PATCH', '**/company_settings**', (req) => {
    req.reply({ body: { ...defaultSettings, ...req.body } });
  }).as('patchSettings');

  return cy.wrap(defaultSettings);
});

/**
 * Mock a real-time WebSocket message for ticket status change.
 * Dispatches a CustomEvent that the app's realtime hook listens to.
 */
Cypress.Commands.add('emitRealtimeTicketUpdate', (ticketId, newStatus) => {
  cy.window().then((win) => {
    win.dispatchEvent(
      new win.CustomEvent('supabase:ticket_update', {
        detail: { ticket_id: ticketId, status: newStatus, updated_at: new Date().toISOString() },
      })
    );
  });
});

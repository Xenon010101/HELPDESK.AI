import './commands';

// Suppress uncaught exceptions from third-party scripts (e.g. Supabase realtime)
Cypress.on('uncaught:exception', (err) => {
  if (
    err.message.includes('ResizeObserver loop') ||
    err.message.includes('Non-Error promise rejection')
  ) {
    return false;
  }
});

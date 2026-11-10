#!/usr/bin/env node
/**
 * Meher EMB server entry point.
 */
import { createApp } from './app.js';

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

const { app, auth } = createApp();

const server = app.listen(port, host, () => {
  console.log(`Meher EMB is running on http://${host}:${port}`);
  if (!auth.isConfigured) {
    console.warn(`[admin] ${auth.setupMessage}`);
  } else if (auth.ephemeralSecret) {
    console.warn('[admin] SESSION_SECRET is not set — sessions will be invalidated on restart.');
  }
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}

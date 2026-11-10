#!/usr/bin/env node
/**
 * Generates an ADMIN_PASSWORD_HASH value for .env
 * Usage: npm run hash-password -- "your strong password"
 */
import { hashPassword } from '../server/auth.js';

const password = process.argv[2];

if (!password || password.length < 10) {
  console.error('Usage: npm run hash-password -- "a password of at least 10 characters"');
  process.exit(1);
}

console.log('Add this line to your .env file (and remove ADMIN_PASSWORD):');
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}`);

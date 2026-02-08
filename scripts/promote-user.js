#!/usr/bin/env node
'use strict';

const path = require('path');
const { promoteUser } = require(path.join(__dirname, '..', 'db'));

const email = process.argv[2] || 'matthew.d.mcconkey@gmail.com';
const ok = promoteUser(email);
if (ok) {
  console.log('Promoted:', email, '-> role: admin, plan: pro (full access)');
} else {
  console.log('No user found with email:', email);
  process.exitCode = 1;
}

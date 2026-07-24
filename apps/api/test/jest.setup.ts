import * as path from 'node:path';

import * as dotenv from 'dotenv';

// dotenv does not override variables already present in process.env, so CI (which sets
// DATABASE_URL/DIRECT_URL directly against its Postgres service container) is unaffected.
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

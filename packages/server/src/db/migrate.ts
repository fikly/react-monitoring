import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function runMigrations(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  console.log(`Found ${files.length} migration files`);
  console.log('Note: Run these SQL files in the Supabase SQL Editor at https://supabase.com/dashboard');
  console.log('Supabase does not support running raw SQL via the JS client.');
  console.log('');

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`--- ${file} ---`);
    console.log(sql);
    console.log('');
  }

  console.log('Copy and run the above SQL in your Supabase SQL Editor.');
  console.log('Dashboard: https://supabase.com/dashboard → SQL Editor');
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

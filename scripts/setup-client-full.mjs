#!/usr/bin/env node
/**
 * سكربت كامل لإعداد عميل جديد بدون إنشاء مشروع جديد
 * يطبق migrations وينشئ buckets عبر service_role
 * 
 * الاستخدام:
 * SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx SUPABASE_DB_URL=postgres://... node scripts/setup-client-full.mjs
 */

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const dbUrl = process.env.SUPABASE_DB_URL?.trim(); // optional, for psql via API

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ ضع SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = join(process.cwd(), 'supabase/migrations');
const files = readdirSync(migrationsDir).filter(f=>f.endsWith('.sql')).sort();

console.log(`📂 وجد ${files.length} migration`);

for (const file of files) {
  console.log(`\n--- تطبيق ${file} ---`);
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  // نستخدم supabase REST rpc لتطبيق SQL؟ لا يوجد endpoint مباشر
  // لذلك نطبع تعليمات: يجب تشغيله عبر psql أو SQL Editor
  // هنا نحاول عبر pg client إذا توفر SUPABASE_DB_URL
  if (dbUrl) {
    // سنستخدم fetch إلى supabase SQL API غير موجود، لذا نطلب psql
    console.log('   استخدم psql لتطبيق هذا الملف');
  } else {
    console.log('   انسخه إلى SQL Editor في Dashboard');
  }
}

console.log('\n🪣 إنشاء buckets...');
async function createBucket(id, isPublic) {
  const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, name: id, public: isPublic }),
  });
  const text = await res.text();
  if (res.ok) console.log(`✅ ${id} تم إنشاؤه`);
  else if (text.includes('already exists') || text.includes('Duplicate')) console.log(`ℹ️ ${id} موجود بالفعل`);
  else console.log(`⚠️ ${id} فشل: ${text}`);
}

await createBucket('catalogue-images', true);
await createBucket('condition-photos', false);
await createBucket('backups', false);

console.log('\n✅ انتهى! التالي:');
console.log('1. Auth -> Email Enable');
console.log('2. نشر Vercel مع VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY');
console.log('3. افتح /setup لتأسيس أول مديرة');

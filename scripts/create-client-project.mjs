#!/usr/bin/env node
/**
 * إنشاء مشروع Supabase جديد لعميل واحد — يبيع لـ 100 معرض بمشاريع منفصلة
 * 
 * الاستخدام:
 * SUPABASE_ACCESS_TOKEN=sbp_xxx SUPABASE_ORG_ID=xxx node scripts/create-client-project.mjs alnoor --region eu-central-1
 * 
 * المتطلبات:
 * - SUPABASE_ACCESS_TOKEN من https://supabase.com/dashboard/account/tokens
 * - SUPABASE_ORG_ID من https://supabase.com/dashboard/org/<org>/general
 * 
 * ماذا يفعل:
 * 1. ينشئ مشروع Supabase جديد عبر Management API
 * 2. ينتظر حتى يصبح المشروع جاهز
 * 3. يطبع URL والمفاتيح وخطوات Vercel
 * 4. يذكرك بتشغيل migrations
 */

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const orgId = process.env.SUPABASE_ORG_ID?.trim();
const clientSlug = process.argv[2]?.trim();
const region = process.argv.find(arg => arg.startsWith('--region'))?.split('=')[1] || process.argv[process.argv.indexOf('--region')+1] || 'eu-central-1';

if (!token) {
  console.error('❌ ضع SUPABASE_ACCESS_TOKEN في البيئة. احصله من https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}
if (!orgId) {
  console.error('❌ ضع SUPABASE_ORG_ID في البيئة. احصله من https://supabase.com/dashboard/org/<org>/general');
  process.exit(1);
}
if (!clientSlug || !/^[a-z0-9-]{3,30}$/.test(clientSlug)) {
  console.error('❌ الاستخدام: node scripts/create-client-project.mjs <client-slug> [--region eu-central-1]');
  console.error('   مثال: node scripts/create-client-project.mjs alnoor --region eu-central-1');
  console.error('   slug يجب أن يكون أحرف صغيرة وأرقام وشرطة فقط، 3-30 حرف');
  process.exit(1);
}

const projectName = `lena-showroom-${clientSlug}`;
const dbPassword = generatePassword();

console.log(`🚀 إنشاء مشروع ${projectName} في ${region}...`);
console.log(`   المنظمة: ${orgId}`);
console.log(`   قاعدة البيانات كلمة المرور (احفظها): ${dbPassword}`);

async function api(path, options = {}) {
  const res = await fetch(`https://api.supabase.com${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) {
    console.error(`❌ API فشل ${path}: ${res.status}`, json);
    throw new Error(`API ${path} failed`);
  }
  return json;
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i=0;i<16;i++) pwd += chars[Math.floor(Math.random()*chars.length)];
  return pwd + 'A1!';
}

// 1. إنشاء المشروع
const created = await api('/v1/projects', {
  method: 'POST',
  body: JSON.stringify({
    name: projectName,
    organization_id: orgId,
    region,
    db_pass: dbPassword,
    plan: 'free', // أو pro حسب الحاجة
  }),
});

console.log('✅ تم إنشاء المشروع، ID:', created.id);
console.log('⏳ انتظار حتى يصبح جاهز (قد يستغرق 2-3 دقائق)...');

let project;
for (let i=0;i<30;i++) {
  await new Promise(r=>setTimeout(r, 10000));
  try {
    project = await api(`/v1/projects/${created.id}`);
    console.log(`   حالة: ${project.status} (${i*10}s)`);
    if (project.status === 'ACTIVE_HEALTHY' || project.status === 'ACTIVE') break;
  } catch {
    console.log('   انتظار...');
  }
}

if (!project || (project.status !== 'ACTIVE_HEALTHY' && project.status !== 'ACTIVE')) {
  console.error('❌ المشروع لم يصبح جاهز في الوقت المتوقع. راجعه من لوحة Supabase.');
  console.log('ID:', created.id);
  process.exit(1);
}

console.log('\n✅ المشروع جاهز!');
console.log(`\n📋 معلومات العميل ${clientSlug}:`);
console.log(`   Project ID: ${project.id}`);
console.log(`   Name: ${project.name}`);
console.log(`   Region: ${project.region}`);
console.log(`   DB Host: ${project.database?.host || 'db.'+project.id+'.supabase.co'}`);
console.log(`\n🔑 احصل على المفاتيح من:`);
console.log(`   https://supabase.com/dashboard/project/${project.id}/settings/api`);
console.log(`\n📂 بعد الحصول على المفاتيح، شغّل:`);
console.log(`   SUPABASE_URL=https://<project>.supabase.co SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx ./scripts/setup-client-migrations.sh ${clientSlug}`);
console.log(`\n🚀 ثم انشر على Vercel:`);
console.log(`   vercel --prod -e VITE_SUPABASE_URL=https://<project>.supabase.co -e VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx`);
console.log(`\n🌐 بعد النشر، افتح:`);
console.log(`   https://<your-domain>/setup لتأسيس أول مديرة`);
console.log(`\n💾 كلمة مرور قاعدة البيانات (احفظها في مكان آمن): ${dbPassword}`);

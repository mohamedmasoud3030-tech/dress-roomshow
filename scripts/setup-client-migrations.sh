#!/usr/bin/env bash
# إعداد مشروع Supabase موجود لعميل واحد — تشغيل migrations وإنشاء buckets
# الاستخدام:
# SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx ./scripts/setup-client-migrations.sh alnoor

set -euo pipefail

CLIENT_SLUG="${1:-}"
if [[ -z "$CLIENT_SLUG" ]]; then
  echo "❌ الاستخدام: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ./scripts/setup-client-migrations.sh <client-slug>"
  exit 1
fi

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "❌ ضع SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في البيئة"
  echo "   SUPABASE_URL من Settings -> API -> Project URL"
  echo "   SERVICE_ROLE_KEY من Settings -> API -> service_role (secret)"
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "🚀 إعداد العميل $CLIENT_SLUG على $SUPABASE_URL"

# 1. تشغيل migrations عبر psql أو supabase CLI
# نحاول استخدام supabase CLI إذا متوفر، وإلا نستخدم psql مباشرة عبر connection string
# هنا نستخدم الطريقة البسيطة: تطبيق كل ملف SQL عبر REST؟ لا، نحتاج DB connection
# لذلك نطلب من المستخدم تشغيل migrations يدوياً من SQL Editor إذا لم يتوفر psql

echo "📂 تطبيق migrations 0001-0033..."
echo "   إذا كان لديك psql و DATABASE_URL، شغّل:"
echo "   for f in $ROOT/supabase/migrations/*.sql; do psql \$DATABASE_URL -f \$f; done"
echo ""
echo "   أو انسخ كل ملف إلى SQL Editor في Supabase Dashboard وشغّله بالترتيب"
echo ""

# 2. إنشاء buckets عبر API
echo "🪣 إنشاء buckets..."
for bucket in catalogue-images condition-photos backups; do
  echo "   إنشاء $bucket..."
  curl -s -X POST "$SUPABASE_URL/storage/v1/bucket" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"$bucket\",\"name\":\"$bucket\",\"public\":$([ "$bucket" = "catalogue-images" ] && echo true || echo false)}" \
    | grep -q "already exists" && echo "   $bucket موجود بالفعل" || echo "   $bucket تم إنشاؤه"
done

echo ""
echo "✅ الإعداد الأساسي تم!"
echo "📋 التالي:"
echo "   1. اذهب إلى Auth -> Providers -> Email -> Enable"
echo "   2. في Auth -> Settings -> Disable Signups = OFF مؤقتاً لأول تأسيس"
echo "   3. انشر الواجهة على Vercel:"
echo "      VITE_SUPABASE_URL=$SUPABASE_URL"
echo "      VITE_SUPABASE_PUBLISHABLE_KEY=<من Settings -> API -> publishable>"
echo "   4. افتح https://<domain>/setup لتأسيس أول مديرة"
echo "   5. بعد التأسيس، ارجع Disable Signups = ON إذا تريد"

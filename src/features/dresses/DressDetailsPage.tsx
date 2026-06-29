import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { DRESS_STATUS_LABELS, DRESS_STATUS_STYLES, INVENTORY_ITEM_TYPE_LABELS } from '../../shared/domain/dressConstants';
import { formatMoneyOMR } from '../../shared/utils/format';
import { BarcodeGenerator } from './BarcodeGenerator';
import { getBarcodeEngineEnvironmentNote, getBarcodeRuntimeSupportStatus } from './barcode.utils';
import { deleteDress, getDresses } from './dress.service';

export function DressDetailsPage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const dress = getDresses().find((item) => item.code === code);

  const handleDelete = () => {
    if (!dress) return;
    if (!window.confirm(`هل تريدين حذف العنصر "${dress.name}" (${dress.code}) نهائياً؟`)) return;
    const deleted = deleteDress(dress.code);
    if (deleted) {
      navigate('/inventory', { replace: true });
    }
  };

  if (!dress) {
    return (
      <section className="space-y-4">
        <PageHeader
          eyebrow="تفاصيل عنصر المخزون"
          title="العنصر غير موجود"
          description="تعذر العثور على العنصر المطلوب. ربما تم حذفه أو أن الرابط غير صحيح."
        />
        <Link
          to="/inventory"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-stone-100"
        >
          <ArrowRight className="h-4 w-4" />
          العودة إلى المخزون
        </Link>
      </section>
    );
  }

  const cameraSupport = getBarcodeRuntimeSupportStatus();
  const engineNote = getBarcodeEngineEnvironmentNote();
  const primaryImage = dress.images[0];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <PageHeader
          eyebrow="تفاصيل عنصر المخزون"
          title={dress.name}
          description="مراجعة بيانات العنصر والباركود وحالة الجاهزية للطباعة والمسح."
        />
        <div className="flex flex-wrap gap-3">
          <Link
            to="/inventory"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-stone-100"
          >
            <ArrowRight className="h-4 w-4" />
            العودة إلى المخزون
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-700 shadow-sm transition hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" />
            حذف العنصر
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="كود العنصر" value={dress.code} />
        <SummaryCard label="نوع العنصر" value={INVENTORY_ITEM_TYPE_LABELS[dress.itemType ?? 'dress']} />
        <SummaryCard label="الباركود" value={dress.barcode} />
        <SummaryCard label="سعر البيع" value={dress.isForSale ? formatMoneyOMR(dress.salePrice) : 'غير متاح'} tone={dress.isForSale ? 'positive' : 'default'} />
        <SummaryCard label="سعر الإيجار" value={dress.isForRent ? formatMoneyOMR(dress.rentalPrice) : 'غير متاح'} tone={dress.isForRent ? 'positive' : 'default'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {primaryImage ? (
            <img src={primaryImage} alt={dress.name} className="h-80 w-full rounded-2xl object-cover" />
          ) : (
            <div className="flex h-80 items-center justify-center rounded-2xl bg-stone-100 text-slate-400">
              لا توجد صورة رئيسية لهذا العنصر
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-400">الحالة</p>
              <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${DRESS_STATUS_STYLES[dress.status]}`}>
                {DRESS_STATUS_LABELS[dress.status]}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-400">الفئة</p>
              <p className="mt-2 text-base font-bold text-slate-900">{dress.category}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">اللون</p>
              <p className="mt-2 text-base font-bold text-slate-900">{dress.color}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">المقاس</p>
              <p className="mt-2 text-base font-bold text-slate-900" dir="ltr">{dress.size}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">التأمين</p>
              <p className="mt-2 text-base font-bold text-slate-900">{dress.isForRent ? formatMoneyOMR(dress.depositAmount) : 'غير متاح'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">عدد مرات التأجير</p>
              <p className="mt-2 text-base font-bold text-slate-900">{dress.timesRented}</p>
            </div>
          </div>

          {dress.description && (
            <div>
              <p className="text-sm text-slate-400">الوصف</p>
              <p className="mt-2 leading-7 text-slate-700">{dress.description}</p>
            </div>
          )}

          {dress.notes && (
            <div>
              <p className="text-sm text-slate-400">ملاحظات</p>
              <p className="mt-2 leading-7 text-slate-700">{dress.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <BarcodeGenerator value={dress.barcode} />

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">جاهزية المسح على الجهاز</h2>
            <p className={`mt-3 text-sm font-medium ${cameraSupport.supported ? 'text-emerald-700' : 'text-amber-800'}`}>
              {cameraSupport.message}
            </p>
            <p className="mt-3 text-sm text-slate-600">{engineNote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

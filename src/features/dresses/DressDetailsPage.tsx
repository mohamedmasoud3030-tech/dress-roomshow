import { useParams } from 'react-router-dom';
import { getDresses } from './dress.service';

export function DressDetailsPage() {
  const { code = '' } = useParams();
  const dress = getDresses().find((item) => item.code === code);
  return <section className="space-y-4"><h1 className="text-3xl font-bold">{dress?.name ?? 'الفستان غير موجود'}</h1><p dir="ltr" className="text-sm font-bold text-slate-500">{dress?.code}</p></section>;
}

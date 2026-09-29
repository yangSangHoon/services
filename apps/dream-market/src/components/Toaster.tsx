import { useToasts } from '../lib/toast';

export default function Toaster() {
  const toasts = useToasts();
  return (
    <div className="toaster" role="status">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

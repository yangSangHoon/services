import { useToasts } from '../lib/toast';

export default function Toaster() {
  const toasts = useToasts();
  return (
    <div className="toaster" role="status">
      {toasts.slice(-2).map((t) => (
        <div key={t.id} className="toast">
          {t.text}
        </div>
      ))}
    </div>
  );
}

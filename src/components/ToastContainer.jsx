import { useToastStore } from '../stores/toastStore';
import Toast from './Toast';

export default function ToastContainer() {
  const { toasts, hideToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          show={toast.show}
          message={toast.message}
          type={toast.type}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </div>
  );
}

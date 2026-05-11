import { toast } from 'sonner';

export function useToast() {
  return {
    success: (msg) => toast.success(msg, { duration: 3000 }),
    error: (msg, detail) => toast.error(msg, {
      description: detail,
      duration: 5000,
    }),
    info: (msg) => toast.info(msg, { duration: 2500 }),
  };
}

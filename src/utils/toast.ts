import { toast } from "sonner";

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (message: string) => {
  toast.error(message);
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string | number) => { // Updated to accept string | number
  toast.dismiss(toastId);
};

export const showReminder = (message: string, taskId?: string, onSnooze?: (taskId: string) => void, onDismiss?: (taskId: string) => void): string | number | undefined => {
  return toast.info(message, {
    id: taskId,
    duration: Infinity,
    action: taskId ? {
      label: "Dismiss",
      onClick: () => {
        toast.dismiss(taskId);
        onDismiss?.(taskId);
      },
    } : undefined,
    cancel: taskId && onSnooze ? {
      label: "Snooze",
      onClick: () => {
        toast.dismiss(taskId);
        onSnooze?.(taskId);
      },
    } : undefined,
  });
};
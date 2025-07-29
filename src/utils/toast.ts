import { toast } from "sonner";

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (message: string) => {
  toast.error(`[ERROR SOURCE] ${message}`);
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

export const showReminder = (message: string, taskId?: string) => {
  toast.info(message, {
    id: taskId, // Use task ID for dismiss if needed
    duration: 10000, // Keep reminder visible for 10 seconds
    action: {
      label: "Dismiss",
      onClick: () => toast.dismiss(taskId),
    },
  });
};
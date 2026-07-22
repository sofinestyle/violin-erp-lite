import { toast as sonnerToast } from "sonner";

export const toast = {
  success(message: string) {
    return sonnerToast.success(message);
  },
  error(message: string) {
    return sonnerToast.error(message);
  },
  info(message: string) {
    return sonnerToast.info(message);
  },
};

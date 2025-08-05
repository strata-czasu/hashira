import { clsx } from "clsx";

export type ToastType = "error" | "success";

export type ToastData = {
  message: string;
  type: ToastType;
};

type ToastProps = {
  toast: ToastData;
};

export function Toast({ toast }: ToastProps) {
  return (
    <div
      className={clsx([
        "fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg text-white font-medium z-50 transition-all duration-300",
        toast.type === "error" && "bg-red-500",
        toast.type === "success" && "bg-green-500",
      ])}
    >
      {toast.message}
    </div>
  );
}

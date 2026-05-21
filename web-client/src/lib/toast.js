import { addToast } from "@heroui/react";

export const toast = {
  success: (description) =>
    addToast({ title: "Thành công", description, color: "success" }),
  error: (description) =>
    addToast({ title: "Lỗi", description, color: "danger" }),
  warning: (description) =>
    addToast({ title: "Cảnh báo", description, color: "warning" }),
  info: (description) =>
    addToast({ title: "Thông báo", description, color: "primary" }),
};

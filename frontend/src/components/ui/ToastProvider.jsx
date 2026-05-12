import { ToastContext } from "../../hooks/useToast";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const ToastProvider = ({ children }) => {
  const pushToast = ({ title, variant = "success" }) => {
    if (variant === "error") {
      toast.error(title);
      return;
    }
    if (variant === "warning") {
      toast.warning(title);
      return;
    }
    toast.success(title);
  };

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={3200}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
      />
    </ToastContext.Provider>
  );
};

import { Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuthController } from "../../controllers/auth.controller";
import { TeacherLoginView } from "./TeacherLoginView";
import { AdminLoginView } from "./AdminLoginView";

export const LoginPage = ({ expectedRole }) => {
  const { login, loading } = useAuthController();
  const [form, setForm] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    await login(form, expectedRole, rememberMe);
  };

  if (expectedRole === "teacher") {
    return (
      <TeacherLoginView
        form={form}
        setForm={setForm}
        onSubmit={onSubmit}
        loading={loading}
        rememberMe={rememberMe}
        setRememberMe={setRememberMe}
      />
    );
  }

  if (expectedRole === "admin") {
    return (
      <AdminLoginView
        loading={loading}
        rememberMe={rememberMe}
        setRememberMe={setRememberMe}
        onLogin={(creds) => login(creds, "admin", rememberMe)}
      />
    );
  }

  return <Navigate to="/" replace />;
};

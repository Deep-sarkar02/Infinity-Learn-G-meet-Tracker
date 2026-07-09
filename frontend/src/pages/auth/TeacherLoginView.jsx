import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import {
  AuthCheckbox,
  AuthOutlinedField,
  AuthPrimaryButton,
  InfinityLearnLoginLayout,
} from "../../components/auth/InfinityLearnLoginLayout";

export const TeacherLoginView = ({
  form,
  setForm,
  onSubmit,
  loading,
  rememberMe,
  setRememberMe,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const canSubmit = Boolean(form.email.trim() && form.password);

  return (
    <InfinityLearnLoginLayout
      welcomeRole="Teacher"
      welcomeSubtitle="Please enter your email and password to sign in to your teacher workspace."
      backTo="/"
      footerLinks={[
        { label: "Login as admin", to: "/login/admin" },
        { label: "Back to home", to: "/" },
      ]}
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <AuthOutlinedField
          id="teacher-email"
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          required
        />

        <AuthOutlinedField
          id="teacher-password"
          label="Password"
          type={showPassword ? "text" : "password"}
          name="password"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          required
          trailing={
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#007BFF] hover:bg-[#F5F8FF]"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
            </button>
          }
        />

        <AuthCheckbox
          id="teacher-remember"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        >
          Remember me for 10 days on this device.
        </AuthCheckbox>

        <AuthPrimaryButton disabled={!canSubmit} loading={loading}>
          Sign in
        </AuthPrimaryButton>
      </form>
    </InfinityLearnLoginLayout>
  );
};

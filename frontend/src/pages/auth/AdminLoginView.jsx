import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import {
  AuthCheckbox,
  AuthOutlinedField,
  AuthPrimaryButton,
  InfinityLearnLoginLayout,
} from "../../components/auth/InfinityLearnLoginLayout";

export const AdminLoginView = ({ onLogin, loading, rememberMe, setRememberMe }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const canSubmit = Boolean(email.trim() && password);

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin({ email: email.trim(), password });
  };

  return (
    <InfinityLearnLoginLayout
      welcomeRole="Admin"
      welcomeSubtitle="Please enter your admin email and password to access the operations console."
      backTo="/"
      footerLinks={[
        { label: "Login as teacher", to: "/login/teacher" },
        { label: "Back to home", to: "/" },
      ]}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <AuthOutlinedField
          id="admin-email"
          label="Email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <AuthOutlinedField
          id="admin-password"
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          id="admin-remember"
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

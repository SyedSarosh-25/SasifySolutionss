import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Eye, EyeOff, Gift, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialReferralCode = searchParams.get("ref")?.trim().toUpperCase() ?? "";
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [referralCodeToValidate, setReferralCodeToValidate] = useState(initialReferralCode);
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"login" | "register">(initialReferralCode ? "register" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (user) => {
      utils.auth.me.setData(undefined, user);
      toast.success("Signed in successfully");
      navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      void utils.auth.me.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (user) => {
      utils.auth.me.setData(undefined, user);
      toast.success("Account created");
      navigate("/tools", { replace: true });
      void utils.auth.me.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const isPending = loginMutation.isPending || registerMutation.isPending;
  useEffect(() => {
    const timer = window.setTimeout(() => setReferralCodeToValidate(referralCode), 350);
    return () => window.clearTimeout(timer);
  }, [referralCode]);
  const referralValidation = trpc.referral.validateCode.useQuery(
    { code: referralCodeToValidate },
    { enabled: mode === "register" && referralCodeToValidate.length >= 4, retry: false },
  );
  const referralIsInvalid = Boolean(referralCode && (
    referralCode.length < 4
    || referralCodeToValidate !== referralCode
    || !referralValidation.data?.valid
  ));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "register") {
      registerMutation.mutate({ ...form, referralCode: referralCode || undefined });
      return;
    }
    loginMutation.mutate({ email: form.email, password: form.password });
  }

  return (
    <main className="min-h-screen bg-[#f7f9ff] px-4 py-10 text-[#050816]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_70px_rgba(12,37,104,0.14)] ring-1 ring-[#dfe6ff] lg:grid-cols-[0.95fr_1.05fr]">
          <section className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#061652,#075dff_52%,#6d35ff)] p-10 text-white lg:block">
            <div className="relative z-10">
              <Link to="/" className="inline-flex items-center gap-3">
                <img src="/brand/sasify-logo.jpg" alt="Sasify Solutions" width="56" height="56" decoding="async" className="h-14 w-14 rounded-full bg-white p-1" />
                <div>
                  <p className="text-2xl font-black leading-none">SASIFY</p>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d9e7ff]">Solutions</p>
                </div>
              </Link>
              <h1 className="mt-16 max-w-md text-5xl font-black leading-tight">
                Manage your digital services from one secure account.
              </h1>
              <p className="mt-5 max-w-md text-base font-medium leading-relaxed text-white/78">
                Access your wallet, orders, support tickets, and digital purchases with secure email login.
              </p>
            </div>
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/18 blur-3xl" />
            <div className="absolute -bottom-28 left-10 h-80 w-80 rounded-full bg-[#28d7ff]/20 blur-3xl" />
          </section>

          <section className="p-6 sm:p-10">
            <Link to="/" className="mb-8 inline-flex items-center gap-3 lg:hidden">
              <img src="/brand/sasify-logo.jpg" alt="Sasify Solutions" width="48" height="48" decoding="async" className="h-12 w-12 rounded-full ring-1 ring-[#dfe6ff]" />
              <div>
                <p className="text-xl font-black leading-none">SASIFY</p>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#155cff]">Solutions</p>
              </div>
            </Link>

            <div className="mx-auto max-w-md">
              <div className="inline-flex rounded-full bg-[#eef3ff] p-1">
                {(["login", "register"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMode(item)}
                    className={`tap-target rounded-full px-5 py-2 text-sm font-black transition ${
                      mode === item
                        ? "bg-white text-[#155cff] shadow-sm"
                        : "text-[#596176] hover:text-[#050816]"
                    }`}
                  >
                    {item === "login" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>

              <h2 className="mt-8 text-4xl font-black">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-3 text-sm font-medium leading-relaxed text-[#596176]">
                {mode === "login"
                  ? "Use your Sasify email and password to continue."
                  : "Create a customer account to buy plans and open support tickets."}
              </p>

              <form onSubmit={submit} className="mt-8 space-y-4" noValidate={false}>
                {mode === "register" && (
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wider text-[#596176]">Name</span>
                    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[#dfe6ff] bg-white px-4 py-3 focus-within:border-[#155cff] focus-within:ring-4 focus-within:ring-[#155cff]/12">
                      <User className="h-5 w-5 text-[#155cff]" />
                      <input
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        className="h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#8992aa]"
                        placeholder="Your name"
                        autoComplete="name"
                        required={mode === "register"}
                      />
                    </div>
                  </label>
                )}

                {mode === "register" && (
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wider text-[#596176]">Referral code <span className="normal-case tracking-normal text-[#8992aa]">(optional)</span></span>
                    <div className={`mt-2 flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 focus-within:ring-4 ${referralCode && referralCodeToValidate === referralCode && referralValidation.data && !referralValidation.data.valid ? "border-red-300 focus-within:ring-red-100" : "border-[#dfe6ff] focus-within:border-[#155cff] focus-within:ring-[#155cff]/12"}`}>
                      <Gift className="h-5 w-5 text-[#155cff]" />
                      <input
                        value={referralCode}
                        onChange={(event) => setReferralCode(event.target.value.trimStart().toUpperCase())}
                        className="h-11 min-w-0 flex-1 bg-transparent font-mono text-sm font-semibold uppercase outline-none placeholder:font-sans placeholder:normal-case placeholder:text-[#8992aa]"
                        placeholder="Enter referral code"
                        autoComplete="off"
                        maxLength={40}
                        aria-describedby="referral-code-status"
                      />
                      {referralCode && <button type="button" className="text-xs font-black text-[#155cff] underline" onClick={() => setReferralCode("")}>Remove</button>}
                    </div>
                    <p id="referral-code-status" className={`mt-2 min-h-4 text-xs font-bold ${referralCode && referralCodeToValidate === referralCode && referralValidation.data && !referralValidation.data.valid ? "text-red-700" : "text-[#596176]"}`} role="status">
                      {!referralCode ? "Use a referral link or enter a code here." : referralCode.length < 4 ? "Referral codes are at least 4 characters." : referralCodeToValidate !== referralCode || referralValidation.isLoading ? "Checking referral code..." : referralValidation.data?.valid ? "Referral code verified." : "Referral code is invalid."}
                    </p>
                  </label>
                )}

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wider text-[#596176]">Email</span>
                  <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[#dfe6ff] bg-white px-4 py-3 focus-within:border-[#155cff] focus-within:ring-4 focus-within:ring-[#155cff]/12">
                    <Mail className="h-5 w-5 text-[#155cff]" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      className="h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#8992aa]"
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wider text-[#596176]">Password</span>
                  <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[#dfe6ff] bg-white px-4 py-3 focus-within:border-[#155cff] focus-within:ring-4 focus-within:ring-[#155cff]/12">
                    <Lock className="h-5 w-5 text-[#155cff]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                      className="h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#8992aa]"
                      placeholder={mode === "login" ? "Your password" : "At least 8 characters"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      minLength={mode === "register" ? 8 : undefined}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="tap-target rounded-lg p-1 text-[#596176] hover:bg-[#eef3ff] hover:text-[#155cff]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={isPending || referralIsInvalid}
                  className="w-full rounded-full bg-[linear-gradient(135deg,#075dff,#6d35ff)] px-6 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(21,92,255,0.28)] transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
                >
                  {isPending ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
                </button>
              </form>

              <p className="mt-6 text-center text-xs font-semibold leading-relaxed text-[#7c8498]">
                Your account is protected with an encrypted session cookie.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

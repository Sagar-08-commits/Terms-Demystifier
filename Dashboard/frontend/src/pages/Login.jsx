import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react"; // Auth0 hook

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { loginWithRedirect } = useAuth0();

  // === Dummy Email/Password Login ===
  const submit = (e) => {
    e.preventDefault();
    if (email && password) {
      onLogin({ email: email, isReal: false });
      navigate("/dashboard");
    } else {
      alert("Please enter both email and password.");
    }
  };

  // === Auth0 Login (Real Google Login for Kaali Dashboard) ===
  const handleAuth0Login = async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          connection: "google-oauth2", // Force Google login only
        },
      });
    } catch (err) {
      console.error("Auth0 login error:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-turquoise/6 via-white to-coral/6 py-12">
      <div className="w-full max-w-5xl bg-white/90 rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left: Illustration / Info */}
        <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-turquoise to-coral p-8">
          <div className="text-center px-6">
            <svg
              className="mx-auto mb-4"
              width="140"
              height="140"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="24" height="24" rx="6" fill="white" opacity="0.06" />
              <path
                d="M6 12h12M6 8h12M6 16h12"
                stroke="white"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h3 className="text-2xl font-bold text-white mb-2">
              Terms Demystifier
            </h3>
            <p className="text-sm text-white/90">
              Understand website terms and privacy quickly. Visual summaries and
              risk scores help you decide.
            </p>
          </div>
        </div>

        {/* Right: Form */}
        <div className="p-8">
          <div className="max-w-md mx-auto">
            <h2 className="text-3xl font-extrabold text-gray-800">Sign in</h2>
            <p className="text-sm text-gray-500 mt-2">
              Access your dashboard and latest analyses
            </p>

            <div className="mt-6">
              {/* === Auth0 Google Login Button === */}
              <button
                onClick={handleAuth0Login}
                type="button"
                className="w-full inline-flex items-center justify-center gap-3 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:shadow focus:outline-none"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 48 48"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill="#EA4335"
                    d="M24 12.5v7.9h11.3C34.8 24 30.8 27.5 24 27.5c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.3 0 5.9 1.2 7.8 3.1L24 12.5z"
                  />
                  <path
                    fill="#34A853"
                    d="M12.7 17.3L20 22.1C18.9 24 17 25.5 14.9 26.2L12.7 17.3z"
                  />
                  <path
                    fill="#4A90E2"
                    d="M24 36.5c5.1 0 9.4-2 12.6-5.2l-6.3-4.9c-1.7 1.4-4 2.2-6.3 2.2-5.3 0-9.8-3.4-11.4-8.1L7.5 27.1C10 32.4 16.5 36.5 24 36.5z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="my-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <div className="text-sm text-gray-400">or</div>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* === Dummy Email/Password Login Form === */}
              <form onSubmit={submit} className="space-y-4">
                <label className="block">
                  <span className="text-sm text-gray-600">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 shadow-sm focus:ring-2 focus:ring-turquoise/60 focus:border-transparent"
                    placeholder="you@example.com"
                    required
                  />
                </label>

                <label className="block relative">
                  <span className="text-sm text-gray-600">Password</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 shadow-sm focus:ring-2 focus:ring-turquoise/60 focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-8 text-gray-400"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </label>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4" />
                    <span className="text-gray-600">Remember me</span>
                  </label>
                  <a className="text-turquoise text-sm font-medium" href="#">
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2 rounded-lg text-white font-semibold bg-gradient-to-r from-turquoise to-coral hover:opacity-95 transition"
                >
                  Sign in to account
                </button>
              </form>

              <p className="text-xs text-gray-500 mt-4">
                Demo: Use any email and password to sign in (dummy). The Google
                button above now uses Auth0 for real OAuth login.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

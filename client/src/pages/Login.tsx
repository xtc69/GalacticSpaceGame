import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export function Login() {
  const { login, register, loading, error } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("commander");
  const [password, setPassword] = useState("password123");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "login") {
      await login(username, password).catch(() => {});
    } else {
      await register(username, password).catch(() => {});
    }
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <div className="login__logo">A</div>
        <h1>Void Fleet Command</h1>
        <p className="login__subtitle">PvP dashboard sign-in</p>

        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </label>

        {error && <div className="login__error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
        </button>

        <button
          type="button"
          className="login__toggle"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Need an account? Register" : "Have an account? Log in"}
        </button>

        <p className="login__hint">Demo: commander / password123</p>
      </form>
    </div>
  );
}

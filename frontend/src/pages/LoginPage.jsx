import React, { useState } from "react";
import { HeartPulse, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const { login, registerPatient } = useAuth();
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    emergencyContact: "",
    allergies: "",
    chronicConditions: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signin") {
        await login(form.email, form.password);
      } else {
        await registerPatient(form);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <HeartPulse size={34} />
          <div>
            <h1>HealthUp</h1>
            <p>Healthcare Management System</p>
          </div>
        </div>

        <div className="auth-tabs" aria-label="Authentication mode">
          <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>
            <LogIn size={16} />
            Sign in
          </button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>
            <UserPlus size={16} />
            Patient sign up
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <label>
              Full name
              <input
                type="text"
                value={form.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                required
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              required
            />
          </label>
          {mode === "signup" && (
            <>
              <div className="form-grid">
                <label>
                  Date of birth
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(event) => updateField("dateOfBirth", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Gender
                  <input
                    type="text"
                    value={form.gender}
                    onChange={(event) => updateField("gender", event.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Phone
                  <input type="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
                </label>
                <label>
                  Blood group
                  <input
                    type="text"
                    value={form.bloodGroup}
                    onChange={(event) => updateField("bloodGroup", event.target.value)}
                  />
                </label>
              </div>
              <label>
                Address
                <input type="text" value={form.address} onChange={(event) => updateField("address", event.target.value)} />
              </label>
              <label>
                Emergency contact
                <input
                  type="tel"
                  value={form.emergencyContact}
                  onChange={(event) => updateField("emergencyContact", event.target.value)}
                />
              </label>
              <label>
                Allergies
                <input type="text" value={form.allergies} onChange={(event) => updateField("allergies", event.target.value)} />
              </label>
              <label>
                Chronic conditions
                <input
                  type="text"
                  value={form.chronicConditions}
                  onChange={(event) => updateField("chronicConditions", event.target.value)}
                />
              </label>
            </>
          )}
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {mode === "signin" ? <LogIn size={18} /> : <UserPlus size={18} />}
            {loading ? "Working..." : mode === "signin" ? "Sign in" : "Create patient account"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;

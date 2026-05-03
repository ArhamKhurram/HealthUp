import React, { useState } from "react";
import { HeartPulse, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const auth = useAuth() || {};
  const login = auth.login || (async () => {});
  const registerPatient = auth.registerPatient || (async () => {});
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    passwordConfirm: "",
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
  const [errors, setErrors] = useState([]);
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setErrors([]);
    setLoading(true);

    try {
      if (mode === "signin") {
        await login(form.email, form.password);
      } else {
        const payload = {
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          passwordConfirm: form.passwordConfirm,
          phone: form.phone,
          address: form.address,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          bloodGroup: form.bloodGroup,
          emergencyContact: form.emergencyContact,
          allergies: form.allergies,
          chronicConditions: form.chronicConditions
        };
        await registerPatient(payload);
        setHint("Patient account created. You are now signed in.");
        setForm({
          fullName: "",
          email: "",
          password: "",
          passwordConfirm: "",
          phone: "",
          address: "",
          dateOfBirth: "",
          gender: "",
          bloodGroup: "",
          emergencyContact: "",
          allergies: "",
          chronicConditions: ""
        });
      };
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.errors) {
        setErrors(errData.errors);
        setError(errData.message || "Validation failed");
      } else {
        setError(err.response?.data?.message || "Request failed");
      }
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
          <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => {
            setMode("signin");
            setError("");
            setHint("");
          }}>
            <LogIn size={16} />
            Sign in
          </button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => {
            setMode("signup");
            setError("");
            setHint("New patient? Fill in the sign-up form to create your account.");
          }}>
            <UserPlus size={16} />
            Patient sign up
          </button>
        </div>
        <p className="auth-help">
          {mode === "signin" ? "New patient account needed?" : "Already registered?"}
          {" "}
          <button
            className="auth-link-button"
            type="button"
            onClick={() => {
              const nextMode = mode === "signin" ? "signup" : "signin";
              setMode(nextMode);
              setError("");
              setHint(nextMode === "signup" ? "New patient? Fill in the sign-up form to create your account." : "");
            }}
          >
            {mode === "signin" ? "Sign up here" : "Sign in instead"}
          </button>
        </p>

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
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                required
              />
              <button
                type="button"
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#687a7a",
                  fontWeight: "normal",
                  padding: "4px 8px",
                  fontSize: "13px",
                }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          {mode === "signup" && (
            <label>
              Confirm password
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.passwordConfirm}
                  onChange={(event) => updateField("passwordConfirm", event.target.value)}
                  required
                />
                <button
                  type="button"
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#687a7a",
                    fontWeight: "normal",
                    padding: "4px 8px",
                    fontSize: "13px",
                  }}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
          )}
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
                  <select
                    value={form.gender}
                    onChange={(event) => updateField("gender", event.target.value)}
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Phone
                  <input
                    type="tel"
                    placeholder="e.g., 03001234567"
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                  />
                </label>
                <label>
                  Blood group
                  <select
                    value={form.bloodGroup}
                    onChange={(event) => updateField("bloodGroup", event.target.value)}
                  >
                    <option value="">Select blood group</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
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
          {(error || (errors && errors.length > 0)) && (
            <div>
              {error && <p className="error">{error}</p>}
              {errors && errors.length > 0 && (
                <ul className="error" style={{ textAlign: "left", margin: "8px 0", paddingLeft: "20px" }}>
                  {errors.map((e, i) => (
                    <li key={i}>{e.field ? `${e.field}: ${e.message}` : e.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {hint && <p className="success">{hint}</p>}
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

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BedDouble,
  CalendarDays,
  ClipboardPlus,
  CreditCard,
  FlaskConical,
  Pill,
  Save,
  Star,
  Stethoscope,
  UserPlus,
  Users
} from "lucide-react";
import api from "../api/client";
import SmokeTestPanel from "../components/SmokeTestPanel";

const emptyPatient = {
  fullName: "",
  email: "",
  password: "password",
  phone: "",
  address: "",
  dateOfBirth: "",
  gender: "",
  bloodGroup: "",
  emergencyContact: "",
  allergies: "",
  chronicConditions: ""
};

const emptyDoctor = {
  fullName: "",
  email: "",
  password: "password",
  phone: "",
  specialization: "",
  qualification: "",
  designation: "",
  licenseNumber: "",
  experienceYears: 0,
  consultationFee: 0
};

function useApi(path, fallback = []) {
  const [state, setState] = useState({ loading: true, error: "", data: fallback });

  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const { data } = await api.get(path);
      setState({ loading: false, error: "", data });
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.message || "Unable to load data", data: fallback });
    }
  };

  useEffect(() => {
    load();
  }, [path]);

  return { ...state, reload: load };
}

function Field({ label, children }) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}

function TextInput({ value, onChange, type = "text", required = false }) {
  return <input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} required={required} />;
}

function SelectInput({ value, onChange, options, required = false }) {
  return (
    <select value={value ?? ""} onChange={(event) => onChange(event.target.value)} required={required}>
      <option value="">Select</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function DataTable({ rows, columns, empty = "No records yet." }) {
  if (!rows.length) {
    return <p className="muted">{empty}</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.UserID || row.PatientID || row.DoctorID || row.AppointmentID || row.PaymentID || index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : String(row[column.key] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatGrid({ stats }) {
  return (
    <section className="metric-grid">
      {stats.map((stat) => (
        <div key={stat.label}>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
        </div>
      ))}
    </section>
  );
}

function PageHeader({ eyebrow, title, icon: Icon }) {
  return (
    <header className="page-header">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {Icon && <Icon size={28} />}
    </header>
  );
}

export function AdminDashboard() {
  const users = useApi("/users");
  const patients = useApi("/patients");
  const doctors = useApi("/doctors");
  const appointments = useApi("/opd/appointments");
  const opdPayments = useApi("/billing/opd-payments");

  const revenue = opdPayments.data.reduce((sum, payment) => sum + Number(payment.PaidAmount || 0), 0);

  return (
    <>
      <PageHeader eyebrow="Admin" title="System Overview" icon={Activity} />
      <StatGrid
        stats={[
          { label: "Users", value: users.data.length },
          { label: "Patients", value: patients.data.length },
          { label: "Doctors", value: doctors.data.length },
          { label: "Appointments", value: appointments.data.length },
          { label: "OPD Revenue", value: `Rs ${revenue.toLocaleString()}` },
          { label: "SQL Server", value: "Online" }
        ]}
      />
      <section className="panel-grid">
        <SmokeTestPanel />
      </section>
    </>
  );
}

export function ManagePatients() {
  const patients = useApi("/patients");
  const [form, setForm] = useState(emptyPatient);
  const [message, setMessage] = useState("");

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    await api.post("/auth/register/patient", form);
    setForm(emptyPatient);
    setMessage("Patient account created.");
    patients.reload();
  };

  return (
    <>
      <PageHeader eyebrow="Admin" title="Manage Patients" icon={Users} />
      <section className="workspace-grid">
        <article className="data-panel">
          <header>
            <div>
              <UserPlus size={20} />
              <h2>Register Patient</h2>
            </div>
          </header>
          <form onSubmit={submit}>
            <Field label="Full name"><TextInput value={form.fullName} onChange={(value) => update("fullName", value)} required /></Field>
            <Field label="Email"><TextInput type="email" value={form.email} onChange={(value) => update("email", value)} required /></Field>
            <div className="form-grid">
              <Field label="Password"><TextInput type="password" value={form.password} onChange={(value) => update("password", value)} required /></Field>
              <Field label="Date of birth"><TextInput type="date" value={form.dateOfBirth} onChange={(value) => update("dateOfBirth", value)} required /></Field>
            </div>
            <div className="form-grid">
              <Field label="Gender"><TextInput value={form.gender} onChange={(value) => update("gender", value)} required /></Field>
              <Field label="Blood group"><TextInput value={form.bloodGroup} onChange={(value) => update("bloodGroup", value)} /></Field>
            </div>
            <Field label="Phone"><TextInput value={form.phone} onChange={(value) => update("phone", value)} /></Field>
            <Field label="Address"><TextInput value={form.address} onChange={(value) => update("address", value)} /></Field>
            <button type="submit"><Save size={18} />Create patient</button>
            {message && <p className="success">{message}</p>}
          </form>
        </article>
        <article className="data-panel wide-panel">
          <header>
            <div>
              <Users size={20} />
              <h2>Patient Records</h2>
            </div>
            <span>{patients.data.length}</span>
          </header>
          {patients.error && <p className="error">{patients.error}</p>}
          <DataTable
            rows={patients.data}
            columns={[
              { key: "PatientID", label: "ID" },
              { key: "MRNumber", label: "MR" },
              { key: "FullName", label: "Name" },
              { key: "Email", label: "Email" },
              { key: "Gender", label: "Gender" }
            ]}
          />
        </article>
      </section>
    </>
  );
}

export function ManageDoctors() {
  const doctors = useApi("/doctors");
  const [form, setForm] = useState(emptyDoctor);
  const [message, setMessage] = useState("");
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    const user = await api.post("/users", {
      fullName: form.fullName,
      email: form.email,
      password: form.password,
      role: "Doctor",
      phone: form.phone
    });
    await api.post("/doctors", {
      userId: user.data.UserID,
      specialization: form.specialization,
      qualification: form.qualification,
      designation: form.designation,
      licenseNumber: form.licenseNumber,
      experienceYears: Number(form.experienceYears || 0),
      consultationFee: Number(form.consultationFee || 0),
      availableForOPD: true,
      availableForIPD: true
    });
    setForm(emptyDoctor);
    setMessage("Doctor profile created.");
    doctors.reload();
  };

  return (
    <>
      <PageHeader eyebrow="Admin" title="Manage Doctors" icon={Stethoscope} />
      <section className="workspace-grid">
        <article className="data-panel">
          <header>
            <div><Stethoscope size={20} /><h2>Add Doctor</h2></div>
          </header>
          <form onSubmit={submit}>
            <Field label="Full name"><TextInput value={form.fullName} onChange={(value) => update("fullName", value)} required /></Field>
            <Field label="Email"><TextInput type="email" value={form.email} onChange={(value) => update("email", value)} required /></Field>
            <Field label="Password"><TextInput type="password" value={form.password} onChange={(value) => update("password", value)} required /></Field>
            <Field label="Specialization"><TextInput value={form.specialization} onChange={(value) => update("specialization", value)} required /></Field>
            <Field label="License number"><TextInput value={form.licenseNumber} onChange={(value) => update("licenseNumber", value)} required /></Field>
            <div className="form-grid">
              <Field label="Experience"><TextInput type="number" value={form.experienceYears} onChange={(value) => update("experienceYears", value)} /></Field>
              <Field label="Fee"><TextInput type="number" value={form.consultationFee} onChange={(value) => update("consultationFee", value)} /></Field>
            </div>
            <Field label="Qualification"><TextInput value={form.qualification} onChange={(value) => update("qualification", value)} /></Field>
            <Field label="Designation"><TextInput value={form.designation} onChange={(value) => update("designation", value)} /></Field>
            <button type="submit"><Save size={18} />Create doctor</button>
            {message && <p className="success">{message}</p>}
          </form>
        </article>
        <article className="data-panel wide-panel">
          <header>
            <div><Stethoscope size={20} /><h2>Doctor Directory</h2></div>
            <span>{doctors.data.length}</span>
          </header>
          <DataTable
            rows={doctors.data}
            columns={[
              { key: "DoctorID", label: "ID" },
              { key: "FullName", label: "Name" },
              { key: "Specialization", label: "Specialization" },
              { key: "ConsultationFee", label: "Fee" },
              { key: "AvailableForOPD", label: "OPD" }
            ]}
          />
        </article>
      </section>
    </>
  );
}

export function BookAppointment({ user }) {
  const patients = useApi("/patients");
  const doctors = useApi("/doctors");
  const appointments = useApi("/opd/appointments");
  const [form, setForm] = useState({
    patientId: user.role === "Patient" ? user.patientId || "" : "",
    doctorId: "",
    appointmentDate: "",
    appointmentType: "Consultation",
    chiefComplaint: ""
  });
  const [message, setMessage] = useState("");
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    await api.post("/opd/appointments", {
      ...form,
      patientId: Number(form.patientId),
      doctorId: Number(form.doctorId)
    });
    setMessage("Appointment booked.");
    appointments.reload();
  };

  return (
    <>
      <PageHeader eyebrow={user.role} title="Book OPD Appointment" icon={CalendarDays} />
      <section className="workspace-grid">
        <article className="data-panel">
          <header><div><CalendarDays size={20} /><h2>New Appointment</h2></div></header>
          <form onSubmit={submit}>
            {user.role !== "Patient" && (
              <Field label="Patient">
                <SelectInput
                  value={form.patientId}
                  onChange={(value) => update("patientId", value)}
                  required
                  options={patients.data.map((patient) => ({ value: patient.PatientID, label: `${patient.FullName} (${patient.MRNumber})` }))}
                />
              </Field>
            )}
            <Field label="Doctor">
              <SelectInput
                value={form.doctorId}
                onChange={(value) => update("doctorId", value)}
                required
                options={doctors.data.map((doctor) => ({ value: doctor.DoctorID, label: `${doctor.FullName} - ${doctor.Specialization}` }))}
              />
            </Field>
            <Field label="Date and time"><TextInput type="datetime-local" value={form.appointmentDate} onChange={(value) => update("appointmentDate", value)} required /></Field>
            <Field label="Chief complaint"><TextInput value={form.chiefComplaint} onChange={(value) => update("chiefComplaint", value)} /></Field>
            <button type="submit"><Save size={18} />Book appointment</button>
            {message && <p className="success">{message}</p>}
          </form>
        </article>
        <AppointmentList title="Recent Appointments" rows={appointments.data} />
      </section>
    </>
  );
}

function AppointmentList({ title, rows }) {
  return (
    <article className="data-panel wide-panel">
      <header><div><CalendarDays size={20} /><h2>{title}</h2></div><span>{rows.length}</span></header>
      <DataTable
        rows={rows}
        columns={[
          { key: "AppointmentID", label: "ID" },
          { key: "PatientName", label: "Patient" },
          { key: "DoctorName", label: "Doctor" },
          { key: "AppointmentDate", label: "Date", render: (row) => new Date(row.AppointmentDate).toLocaleString() },
          { key: "Status", label: "Status" }
        ]}
      />
    </article>
  );
}

export function DoctorAppointments({ user }) {
  const appointments = useApi("/opd/appointments");
  const rows = appointments.data.filter((appointment) => !user.doctorId || appointment.DoctorID === user.doctorId);

  return (
    <>
      <PageHeader eyebrow="Doctor" title="OPD Appointments" icon={CalendarDays} />
      <AppointmentList title="Assigned Appointments" rows={rows} />
    </>
  );
}

export function AddPrescription({ user }) {
  const appointments = useApi("/opd/appointments");
  const medications = useApi("/pharmacy/medications");
  const [form, setForm] = useState({ appointmentId: "", medicationId: "", diagnosis: "", dosage: "", frequency: "" });
  const [message, setMessage] = useState("");

  const selected = appointments.data.find((appointment) => String(appointment.AppointmentID) === String(form.appointmentId));
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    const prescription = await api.post("/opd/prescriptions", {
      appointmentId: Number(form.appointmentId),
      patientId: selected.PatientID,
      doctorId: selected.DoctorID,
      diagnosis: form.diagnosis
    });
    if (form.medicationId) {
      await api.post("/opd/prescription-medications", {
        prescriptionId: prescription.data.PrescriptionID,
        medicationId: Number(form.medicationId),
        dosage: form.dosage,
        frequency: form.frequency
      });
    }
    setMessage("Prescription saved.");
  };

  const appointmentOptions = appointments.data
    .filter((appointment) => !user.doctorId || appointment.DoctorID === user.doctorId)
    .map((appointment) => ({
      value: appointment.AppointmentID,
      label: `#${appointment.AppointmentID} ${appointment.PatientName} - ${new Date(appointment.AppointmentDate).toLocaleString()}`
    }));

  return (
    <>
      <PageHeader eyebrow="Doctor" title="Add OPD Prescription" icon={ClipboardPlus} />
      <article className="data-panel form-panel">
        <form onSubmit={submit}>
          <Field label="Appointment"><SelectInput value={form.appointmentId} onChange={(value) => update("appointmentId", value)} options={appointmentOptions} required /></Field>
          <Field label="Diagnosis"><TextInput value={form.diagnosis} onChange={(value) => update("diagnosis", value)} /></Field>
          <Field label="Medication">
            <SelectInput
              value={form.medicationId}
              onChange={(value) => update("medicationId", value)}
              options={medications.data.map((medication) => ({ value: medication.MedicationID, label: medication.MedicationName }))}
            />
          </Field>
          <div className="form-grid">
            <Field label="Dosage"><TextInput value={form.dosage} onChange={(value) => update("dosage", value)} /></Field>
            <Field label="Frequency"><TextInput value={form.frequency} onChange={(value) => update("frequency", value)} /></Field>
          </div>
          <button type="submit"><Save size={18} />Save prescription</button>
          {message && <p className="success">{message}</p>}
        </form>
      </article>
    </>
  );
}

export function PatientDashboard({ user }) {
  const appointments = useApi("/opd/appointments");
  const payments = useApi("/billing/opd-payments");
  const prescriptions = useApi("/opd/prescriptions");
  const myAppointments = appointments.data.filter((appointment) => appointment.PatientID === user.patientId);
  const myPayments = payments.data.filter((payment) => payment.PatientID === user.patientId);
  const myPrescriptions = prescriptions.data.filter((prescription) => prescription.PatientID === user.patientId);

  return (
    <>
      <PageHeader eyebrow="Patient" title="My HealthUp" icon={Users} />
      <StatGrid
        stats={[
          { label: "Appointments", value: myAppointments.length },
          { label: "Prescriptions", value: myPrescriptions.length },
          { label: "Payments", value: myPayments.length }
        ]}
      />
      <section className="panel-grid">
        <AppointmentList title="My Appointments" rows={myAppointments} />
        <PaymentsPanel rows={myPayments} />
      </section>
    </>
  );
}

export function MyAppointments({ user }) {
  const appointments = useApi("/opd/appointments");
  const rows = appointments.data.filter((appointment) => appointment.PatientID === user.patientId);
  return (
    <>
      <PageHeader eyebrow="Patient" title="My Appointments" icon={CalendarDays} />
      <AppointmentList title="Appointment History" rows={rows} />
    </>
  );
}

function PaymentsPanel({ rows }) {
  return (
    <article className="data-panel">
      <header><div><CreditCard size={20} /><h2>Payments</h2></div><span>{rows.length}</span></header>
      <DataTable
        rows={rows}
        columns={[
          { key: "PaymentID", label: "ID" },
          { key: "TotalAmount", label: "Total" },
          { key: "PaidAmount", label: "Paid" },
          { key: "Status", label: "Status" }
        ]}
      />
    </article>
  );
}

export function PaymentsPage({ user }) {
  const payments = useApi("/billing/opd-payments");
  const appointments = useApi("/opd/appointments");
  const [form, setForm] = useState({ appointmentId: "", patientId: user.role === "Patient" ? user.patientId || "" : "", totalAmount: 0, paidAmount: 0, status: "Pending" });
  const [message, setMessage] = useState("");
  const rows = user.role === "Patient" ? payments.data.filter((payment) => payment.PatientID === user.patientId) : payments.data;
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    await api.post("/billing/opd-payments", {
      appointmentId: Number(form.appointmentId),
      patientId: Number(form.patientId),
      totalAmount: Number(form.totalAmount),
      paidAmount: Number(form.paidAmount),
      status: form.status
    });
    setMessage("Payment recorded.");
    payments.reload();
  };

  const appointmentOptions = appointments.data.map((appointment) => ({
    value: appointment.AppointmentID,
    label: `#${appointment.AppointmentID} ${appointment.PatientName}`
  }));

  return (
    <>
      <PageHeader eyebrow={user.role} title="Payments" icon={CreditCard} />
      <section className="workspace-grid">
        {user.role !== "Patient" && (
          <article className="data-panel">
            <header><div><CreditCard size={20} /><h2>Record Payment</h2></div></header>
            <form onSubmit={submit}>
              <Field label="Appointment"><SelectInput value={form.appointmentId} onChange={(value) => {
                const appointment = appointments.data.find((item) => String(item.AppointmentID) === String(value));
                update("appointmentId", value);
                update("patientId", appointment?.PatientID || "");
              }} options={appointmentOptions} required /></Field>
              <div className="form-grid">
                <Field label="Total"><TextInput type="number" value={form.totalAmount} onChange={(value) => update("totalAmount", value)} /></Field>
                <Field label="Paid"><TextInput type="number" value={form.paidAmount} onChange={(value) => update("paidAmount", value)} /></Field>
              </div>
              <Field label="Status">
                <SelectInput value={form.status} onChange={(value) => update("status", value)} options={["Pending", "Partial", "Paid", "Failed"].map((status) => ({ value: status, label: status }))} />
              </Field>
              <button type="submit"><Save size={18} />Record payment</button>
              {message && <p className="success">{message}</p>}
            </form>
          </article>
        )}
        <PaymentsPanel rows={rows} />
      </section>
    </>
  );
}

export function SubmitReview({ user }) {
  const doctors = useApi("/doctors");
  const [form, setForm] = useState({ doctorId: "", rating: 5, comments: "" });
  const [message, setMessage] = useState("");
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    await api.post("/reviews", {
      patientId: user.patientId,
      doctorId: Number(form.doctorId),
      rating: Number(form.rating),
      comments: form.comments
    });
    setMessage("Review submitted.");
  };

  return (
    <>
      <PageHeader eyebrow="Patient" title="Submit Review" icon={Star} />
      <article className="data-panel form-panel">
        <form onSubmit={submit}>
          <Field label="Doctor"><SelectInput value={form.doctorId} onChange={(value) => update("doctorId", value)} options={doctors.data.map((doctor) => ({ value: doctor.DoctorID, label: doctor.FullName }))} required /></Field>
          <Field label="Rating"><TextInput type="number" value={form.rating} onChange={(value) => update("rating", value)} required /></Field>
          <Field label="Comments"><TextInput value={form.comments} onChange={(value) => update("comments", value)} /></Field>
          <button type="submit"><Save size={18} />Submit review</button>
          {message && <p className="success">{message}</p>}
        </form>
      </article>
    </>
  );
}

export function NurseDashboard() {
  const admissions = useApi("/ipd/admissions");
  return (
    <>
      <PageHeader eyebrow="Nurse" title="Ward Worklist" icon={BedDouble} />
      <AppointmentList title="IPD Patients" rows={[]} />
      <article className="data-panel">
        <header><div><BedDouble size={20} /><h2>Admissions</h2></div><span>{admissions.data.length}</span></header>
        <DataTable
          rows={admissions.data}
          columns={[
            { key: "AdmissionID", label: "ID" },
            { key: "PatientName", label: "Patient" },
            { key: "WardName", label: "Ward" },
            { key: "BedNumber", label: "Bed" },
            { key: "Status", label: "Status" }
          ]}
        />
      </article>
    </>
  );
}

export function DepartmentsManagement() {
  const departments = useApi("/departments");
  const [form, setForm] = useState({ departmentName: "", departmentType: "", location: "" });
  const submit = async (event) => {
    event.preventDefault();
    await api.post("/departments", form);
    setForm({ departmentName: "", departmentType: "", location: "" });
    departments.reload();
  };
  return (
    <>
      <PageHeader eyebrow="Admin" title="Departments Management" icon={Activity} />
      <section className="workspace-grid">
        <article className="data-panel">
          <form onSubmit={submit}>
            <Field label="Department name"><TextInput value={form.departmentName} onChange={(value) => setForm((c) => ({ ...c, departmentName: value }))} required /></Field>
            <Field label="Department type"><TextInput value={form.departmentType} onChange={(value) => setForm((c) => ({ ...c, departmentType: value }))} required /></Field>
            <Field label="Location"><TextInput value={form.location} onChange={(value) => setForm((c) => ({ ...c, location: value }))} /></Field>
            <button type="submit"><Save size={18} />Create department</button>
          </form>
        </article>
        <article className="data-panel wide-panel">
          <DataTable rows={departments.data} columns={[
            { key: "DepartmentID", label: "ID" },
            { key: "DepartmentName", label: "Name" },
            { key: "DepartmentType", label: "Type" },
            { key: "Location", label: "Location" }
          ]} />
        </article>
      </section>
    </>
  );
}

export function WardsBedsManagement() {
  const wards = useApi("/departments/wards");
  const beds = useApi("/departments/beds");
  const departments = useApi("/departments");
  const [wardForm, setWardForm] = useState({ departmentId: "", wardName: "", wardType: "", totalBeds: 1, dailyCharges: 0 });
  const [bedForm, setBedForm] = useState({ wardId: "", bedNumber: "", bedType: "", status: "Available", dailyCharges: 0 });

  const createWard = async (event) => {
    event.preventDefault();
    await api.post("/departments/wards", { ...wardForm, departmentId: Number(wardForm.departmentId), totalBeds: Number(wardForm.totalBeds), dailyCharges: Number(wardForm.dailyCharges) });
    wards.reload();
  };
  const createBed = async (event) => {
    event.preventDefault();
    await api.post("/departments/beds", { ...bedForm, wardId: Number(bedForm.wardId), dailyCharges: Number(bedForm.dailyCharges) });
    beds.reload();
  };
  return (
    <>
      <PageHeader eyebrow="Admin" title="Wards & Beds Management" icon={BedDouble} />
      <section className="workspace-grid">
        <article className="data-panel">
          <header><div><BedDouble size={20} /><h2>Create Ward</h2></div></header>
          <form onSubmit={createWard}>
            <Field label="Department"><SelectInput value={wardForm.departmentId} onChange={(value) => setWardForm((c) => ({ ...c, departmentId: value }))} options={departments.data.map((d) => ({ value: d.DepartmentID, label: d.DepartmentName }))} required /></Field>
            <Field label="Ward name"><TextInput value={wardForm.wardName} onChange={(value) => setWardForm((c) => ({ ...c, wardName: value }))} required /></Field>
            <Field label="Ward type"><TextInput value={wardForm.wardType} onChange={(value) => setWardForm((c) => ({ ...c, wardType: value }))} required /></Field>
            <button type="submit"><Save size={18} />Create ward</button>
          </form>
        </article>
        <article className="data-panel">
          <header><div><BedDouble size={20} /><h2>Create Bed</h2></div></header>
          <form onSubmit={createBed}>
            <Field label="Ward"><SelectInput value={bedForm.wardId} onChange={(value) => setBedForm((c) => ({ ...c, wardId: value }))} options={wards.data.map((w) => ({ value: w.WardID, label: w.WardName }))} required /></Field>
            <Field label="Bed number"><TextInput value={bedForm.bedNumber} onChange={(value) => setBedForm((c) => ({ ...c, bedNumber: value }))} required /></Field>
            <Field label="Bed type"><TextInput value={bedForm.bedType} onChange={(value) => setBedForm((c) => ({ ...c, bedType: value }))} required /></Field>
            <button type="submit"><Save size={18} />Create bed</button>
          </form>
        </article>
      </section>
      <section className="panel-grid">
        <article className="data-panel"><h2>Wards</h2><DataTable rows={wards.data} columns={[{ key: "WardID", label: "ID" }, { key: "WardName", label: "Ward" }, { key: "DepartmentName", label: "Department" }, { key: "TotalBeds", label: "Beds" }]} /></article>
        <article className="data-panel"><h2>Beds</h2><DataTable rows={beds.data} columns={[{ key: "BedID", label: "ID" }, { key: "WardName", label: "Ward" }, { key: "BedNumber", label: "Bed" }, { key: "Status", label: "Status" }]} /></article>
      </section>
    </>
  );
}

export function OpdRoomsManagement() {
  const departments = useApi("/departments");
  const rooms = useApi("/departments/opd-rooms");
  const [form, setForm] = useState({ departmentId: "", roomNumber: "", roomType: "", status: "Available", capacity: 1 });
  const submit = async (event) => {
    event.preventDefault();
    await api.post("/departments/opd-rooms", { ...form, departmentId: Number(form.departmentId), capacity: Number(form.capacity) });
    rooms.reload();
  };
  return (
    <>
      <PageHeader eyebrow="Admin" title="OPD Rooms Management" icon={CalendarDays} />
      <section className="workspace-grid">
        <article className="data-panel">
          <form onSubmit={submit}>
            <Field label="Department"><SelectInput value={form.departmentId} onChange={(value) => setForm((c) => ({ ...c, departmentId: value }))} options={departments.data.map((d) => ({ value: d.DepartmentID, label: d.DepartmentName }))} required /></Field>
            <Field label="Room number"><TextInput value={form.roomNumber} onChange={(value) => setForm((c) => ({ ...c, roomNumber: value }))} required /></Field>
            <Field label="Room type"><TextInput value={form.roomType} onChange={(value) => setForm((c) => ({ ...c, roomType: value }))} required /></Field>
            <button type="submit"><Save size={18} />Create OPD room</button>
          </form>
        </article>
        <article className="data-panel wide-panel"><DataTable rows={rooms.data} columns={[{ key: "RoomID", label: "ID" }, { key: "DepartmentName", label: "Department" }, { key: "RoomNumber", label: "Room" }, { key: "Status", label: "Status" }]} /></article>
      </section>
    </>
  );
}

export function DutyRosterManagement() {
  const users = useApi("/users");
  const departments = useApi("/departments");
  const roster = useApi("/departments/duty-roster");
  const [form, setForm] = useState({ userId: "", departmentId: "", shiftDate: "", shiftType: "" });
  const submit = async (event) => {
    event.preventDefault();
    await api.post("/departments/duty-roster", { ...form, userId: Number(form.userId), departmentId: Number(form.departmentId) });
    roster.reload();
  };
  return (
    <>
      <PageHeader eyebrow="Admin/Nurse" title="Duty Roster Management" icon={CalendarDays} />
      <section className="workspace-grid">
        <article className="data-panel">
          <form onSubmit={submit}>
            <Field label="Staff user"><SelectInput value={form.userId} onChange={(value) => setForm((c) => ({ ...c, userId: value }))} options={users.data.map((u) => ({ value: u.UserID, label: `${u.FullName} (${u.Role})` }))} required /></Field>
            <Field label="Department"><SelectInput value={form.departmentId} onChange={(value) => setForm((c) => ({ ...c, departmentId: value }))} options={departments.data.map((d) => ({ value: d.DepartmentID, label: d.DepartmentName }))} required /></Field>
            <Field label="Shift date"><TextInput type="date" value={form.shiftDate} onChange={(value) => setForm((c) => ({ ...c, shiftDate: value }))} required /></Field>
            <Field label="Shift type"><TextInput value={form.shiftType} onChange={(value) => setForm((c) => ({ ...c, shiftType: value }))} required /></Field>
            <button type="submit"><Save size={18} />Assign shift</button>
          </form>
        </article>
        <article className="data-panel wide-panel"><DataTable rows={roster.data} columns={[{ key: "RosterID", label: "ID" }, { key: "FullName", label: "Staff" }, { key: "DepartmentName", label: "Department" }, { key: "ShiftDate", label: "Date" }, { key: "ShiftType", label: "Shift" }]} /></article>
      </section>
    </>
  );
}

export function EquipmentManagement() {
  const departments = useApi("/departments");
  const equipment = useApi("/departments/equipment");
  const [form, setForm] = useState({ departmentId: "", equipmentName: "", status: "Available" });
  const submit = async (event) => {
    event.preventDefault();
    await api.post("/departments/equipment", { ...form, departmentId: Number(form.departmentId) });
    equipment.reload();
  };
  return (
    <>
      <PageHeader eyebrow="Admin" title="Equipment Management" icon={Activity} />
      <section className="workspace-grid">
        <article className="data-panel">
          <form onSubmit={submit}>
            <Field label="Department"><SelectInput value={form.departmentId} onChange={(value) => setForm((c) => ({ ...c, departmentId: value }))} options={departments.data.map((d) => ({ value: d.DepartmentID, label: d.DepartmentName }))} required /></Field>
            <Field label="Equipment name"><TextInput value={form.equipmentName} onChange={(value) => setForm((c) => ({ ...c, equipmentName: value }))} required /></Field>
            <button type="submit"><Save size={18} />Add equipment</button>
          </form>
        </article>
        <article className="data-panel wide-panel"><DataTable rows={equipment.data} columns={[{ key: "EquipmentID", label: "ID" }, { key: "DepartmentName", label: "Department" }, { key: "EquipmentName", label: "Equipment" }, { key: "Status", label: "Status" }]} /></article>
      </section>
    </>
  );
}

export function ProfilePage({ user }) {
  return (
    <>
      <PageHeader eyebrow="Shared" title="Profile" icon={Users} />
      <article className="data-panel form-panel">
        <dl className="profile-list">
          <div><dt>Name</dt><dd>{user.fullName}</dd></div>
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div><dt>Role</dt><dd>{user.role}</dd></div>
          <div><dt>Phone</dt><dd>{user.phone || "Not set"}</dd></div>
          <div><dt>Address</dt><dd>{user.address || "Not set"}</dd></div>
        </dl>
      </article>
    </>
  );
}

export function DoctorDashboard({ user }) {
  const appointments = useApi("/opd/appointments");
  const admissions = useApi("/ipd/admissions");
  const mine = appointments.data.filter((a) => !user.doctorId || a.DoctorID === user.doctorId);
  const ipdMine = admissions.data.filter((a) => !user.doctorId || a.AttendingDoctorID === user.doctorId);
  return (
    <>
      <PageHeader eyebrow="Doctor" title="Doctor Dashboard" icon={Stethoscope} />
      <StatGrid stats={[{ label: "OPD Appointments", value: mine.length }, { label: "IPD Patients", value: ipdMine.length }]} />
    </>
  );
}

export function AppointmentDetails({ user }) {
  const appointments = useApi("/opd/appointments");
  const rows = appointments.data.filter((a) => !user.doctorId || a.DoctorID === user.doctorId);
  return (
    <>
      <PageHeader eyebrow="Doctor" title="Appointment Details" icon={CalendarDays} />
      <DataTable rows={rows} columns={[{ key: "AppointmentID", label: "ID" }, { key: "PatientName", label: "Patient" }, { key: "ChiefComplaint", label: "Complaint" }, { key: "Status", label: "Status" }]} />
    </>
  );
}

export function OrderOpdTests({ user }) {
  const appointments = useApi("/opd/appointments");
  const tests = useApi("/tests");
  const [form, setForm] = useState({ appointmentId: "", testId: "", results: "" });
  const submit = async (event) => {
    event.preventDefault();
    const selected = appointments.data.find((a) => String(a.AppointmentID) === String(form.appointmentId));
    await api.post("/tests/orders/opd", { appointmentId: Number(form.appointmentId), patientId: selected.PatientID, testId: Number(form.testId), results: form.results, status: "Ordered" });
  };
  const options = appointments.data.filter((a) => !user.doctorId || a.DoctorID === user.doctorId);
  return (
    <>
      <PageHeader eyebrow="Doctor" title="Order OPD Tests" icon={FlaskConical} />
      <article className="data-panel form-panel"><form onSubmit={submit}>
        <Field label="Appointment"><SelectInput value={form.appointmentId} onChange={(v) => setForm((c) => ({ ...c, appointmentId: v }))} options={options.map((a) => ({ value: a.AppointmentID, label: `#${a.AppointmentID} ${a.PatientName}` }))} required /></Field>
        <Field label="Test"><SelectInput value={form.testId} onChange={(v) => setForm((c) => ({ ...c, testId: v }))} options={tests.data.map((t) => ({ value: t.TestID, label: t.TestName }))} required /></Field>
        <button type="submit"><Save size={18} />Order test</button>
      </form></article>
    </>
  );
}

export function MyPrescriptions({ user }) {
  const prescriptions = useApi("/opd/prescriptions");
  const rows = prescriptions.data.filter((p) => p.PatientID === user.patientId);
  return (
    <>
      <PageHeader eyebrow="Patient" title="My Prescriptions" icon={ClipboardPlus} />
      <DataTable rows={rows} columns={[{ key: "PrescriptionID", label: "ID" }, { key: "DoctorName", label: "Doctor" }, { key: "Diagnosis", label: "Diagnosis" }, { key: "PrescriptionDate", label: "Date" }]} />
    </>
  );
}

export function MyTestOrders({ user }) {
  const orders = useApi("/tests/orders/opd");
  const rows = orders.data.filter((o) => o.PatientID === user.patientId);
  return (
    <>
      <PageHeader eyebrow="Patient" title="My Test Orders" icon={FlaskConical} />
      <DataTable rows={rows} columns={[{ key: "TestOrderID", label: "ID" }, { key: "TestName", label: "Test" }, { key: "Status", label: "Status" }, { key: "Results", label: "Results" }]} />
    </>
  );
}

export function MyAdmissions({ user }) {
  const admissions = useApi("/ipd/admissions");
  const rows = admissions.data.filter((a) => a.PatientID === user.patientId);
  return (
    <>
      <PageHeader eyebrow="Patient" title="My Admissions" icon={BedDouble} />
      <DataTable rows={rows} columns={[{ key: "AdmissionID", label: "ID" }, { key: "WardName", label: "Ward" }, { key: "BedNumber", label: "Bed" }, { key: "Status", label: "Status" }]} />
    </>
  );
}

export function IpdPatients({ user }) {
  const admissions = useApi("/ipd/admissions");
  const rows = admissions.data.filter((a) => user.role === "Nurse" || !user.doctorId || a.AttendingDoctorID === user.doctorId);
  return (
    <>
      <PageHeader eyebrow={user.role} title="IPD Patients" icon={BedDouble} />
      <DataTable rows={rows} columns={[{ key: "AdmissionID", label: "ID" }, { key: "PatientName", label: "Patient" }, { key: "WardName", label: "Ward" }, { key: "Status", label: "Status" }]} />
    </>
  );
}

export function ProgressNotesPage({ user }) {
  const admissions = useApi("/ipd/admissions");
  const [form, setForm] = useState({ admissionId: "", vitalSigns: "", progressNotes: "" });
  const submit = async (event) => {
    event.preventDefault();
    // Minimal DB interaction path: reuse IPD diagnosis update as progress update for demo
    const selected = admissions.data.find((a) => String(a.AdmissionID) === String(form.admissionId));
    await api.put(`/ipd/admissions/${form.admissionId}`, {
      patientId: selected.PatientID,
      attendingDoctorId: selected.AttendingDoctorID,
      bedId: selected.BedID,
      wardId: selected.WardID,
      admissionType: selected.AdmissionType,
      status: selected.Status,
      clinicalDiagnosis: `${selected.ClinicalDiagnosis || ""}\n[Progress] ${form.vitalSigns} ${form.progressNotes}`
    });
  };
  return (
    <>
      <PageHeader eyebrow={user.role} title="Add Vitals / Progress Notes" icon={ClipboardPlus} />
      <article className="data-panel form-panel"><form onSubmit={submit}>
        <Field label="Admission"><SelectInput value={form.admissionId} onChange={(v) => setForm((c) => ({ ...c, admissionId: v }))} options={admissions.data.map((a) => ({ value: a.AdmissionID, label: `#${a.AdmissionID} ${a.PatientName}` }))} required /></Field>
        <Field label="Vitals"><TextInput value={form.vitalSigns} onChange={(v) => setForm((c) => ({ ...c, vitalSigns: v }))} /></Field>
        <Field label="Progress note"><TextInput value={form.progressNotes} onChange={(v) => setForm((c) => ({ ...c, progressNotes: v }))} /></Field>
        <button type="submit"><Save size={18} />Save note</button>
      </form></article>
    </>
  );
}

export function ViewReviewsPage() {
  const reviews = useApi("/reviews");
  return (
    <>
      <PageHeader eyebrow="Doctor" title="View Reviews" icon={Star} />
      <DataTable rows={reviews.data} columns={[{ key: "ReviewID", label: "ID" }, { key: "PatientName", label: "Patient" }, { key: "DoctorName", label: "Doctor" }, { key: "Rating", label: "Rating" }, { key: "Comments", label: "Comments" }]} />
    </>
  );
}

export function ReceptionDashboard() {
  const patients = useApi("/patients");
  const appointments = useApi("/opd/appointments");
  return (
    <>
      <PageHeader eyebrow="Receptionist" title="Reception Dashboard" icon={Users} />
      <StatGrid stats={[{ label: "Patients", value: patients.data.length }, { label: "Appointments", value: appointments.data.length }]} />
    </>
  );
}

export function AdmitPatientPage() {
  const patients = useApi("/patients");
  const doctors = useApi("/doctors");
  const wards = useApi("/departments/wards");
  const beds = useApi("/departments/beds");
  const [form, setForm] = useState({ patientId: "", doctorId: "", wardId: "", bedId: "", admissionType: "Emergency" });
  const submit = async (event) => {
    event.preventDefault();
    await api.post("/ipd/admissions", { patientId: Number(form.patientId), attendingDoctorId: Number(form.doctorId), wardId: Number(form.wardId), bedId: Number(form.bedId), admissionType: form.admissionType, clinicalDiagnosis: "Reception admission" });
  };
  return (
    <>
      <PageHeader eyebrow="Receptionist" title="Admit Patient" icon={BedDouble} />
      <article className="data-panel form-panel"><form onSubmit={submit}>
        <Field label="Patient"><SelectInput value={form.patientId} onChange={(v) => setForm((c) => ({ ...c, patientId: v }))} options={patients.data.map((p) => ({ value: p.PatientID, label: p.FullName }))} required /></Field>
        <Field label="Doctor"><SelectInput value={form.doctorId} onChange={(v) => setForm((c) => ({ ...c, doctorId: v }))} options={doctors.data.map((d) => ({ value: d.DoctorID, label: d.FullName }))} required /></Field>
        <Field label="Ward"><SelectInput value={form.wardId} onChange={(v) => setForm((c) => ({ ...c, wardId: v }))} options={wards.data.map((w) => ({ value: w.WardID, label: w.WardName }))} required /></Field>
        <Field label="Bed"><SelectInput value={form.bedId} onChange={(v) => setForm((c) => ({ ...c, bedId: v }))} options={beds.data.filter((b) => b.Status === "Available").map((b) => ({ value: b.BedID, label: `${b.WardName} ${b.BedNumber}` }))} required /></Field>
        <button type="submit"><Save size={18} />Admit patient</button>
      </form></article>
    </>
  );
}

export function AssignBedPage() {
  return <AdmitPatientPage />;
}

export function IpdPatientDetailsPage({ user }) {
  const admissions = useApi("/ipd/admissions");
  const rows = admissions.data.filter((a) => user.role === "Nurse" || !user.doctorId || a.AttendingDoctorID === user.doctorId);
  return (
    <>
      <PageHeader eyebrow={user.role} title="IPD Patient Details" icon={BedDouble} />
      <DataTable
        rows={rows}
        columns={[
          { key: "AdmissionID", label: "Admission" },
          { key: "PatientName", label: "Patient" },
          { key: "DoctorName", label: "Doctor" },
          { key: "WardName", label: "Ward" },
          { key: "BedNumber", label: "Bed" },
          { key: "AdmissionType", label: "Type" },
          { key: "ClinicalDiagnosis", label: "Diagnosis" },
          { key: "Status", label: "Status" }
        ]}
      />
    </>
  );
}

export function AddIpdPrescriptionPage({ user }) {
  const admissions = useApi("/ipd/admissions");
  const medications = useApi("/pharmacy/medications");
  const [form, setForm] = useState({ admissionId: "", medicationId: "", diagnosis: "", dosage: "", frequency: "" });
  const [message, setMessage] = useState("");
  const mine = admissions.data.filter((a) => !user.doctorId || a.AttendingDoctorID === user.doctorId);

  const submit = async (event) => {
    event.preventDefault();
    const selected = mine.find((a) => String(a.AdmissionID) === String(form.admissionId));
    const prescription = await api.post("/ipd/prescriptions", {
      admissionId: Number(form.admissionId),
      patientId: selected.PatientID,
      doctorId: selected.AttendingDoctorID,
      diagnosis: form.diagnosis
    });
    if (form.medicationId) {
      await api.post("/ipd/prescription-medications", {
        prescriptionId: prescription.data.PrescriptionID,
        medicationId: Number(form.medicationId),
        dosage: form.dosage,
        frequency: form.frequency
      });
    }
    setMessage("IPD prescription saved.");
  };

  return (
    <>
      <PageHeader eyebrow="Doctor" title="Add IPD Prescription" icon={ClipboardPlus} />
      <article className="data-panel form-panel">
        <form onSubmit={submit}>
          <Field label="Admission"><SelectInput value={form.admissionId} onChange={(v) => setForm((c) => ({ ...c, admissionId: v }))} options={mine.map((a) => ({ value: a.AdmissionID, label: `#${a.AdmissionID} ${a.PatientName}` }))} required /></Field>
          <Field label="Diagnosis"><TextInput value={form.diagnosis} onChange={(v) => setForm((c) => ({ ...c, diagnosis: v }))} /></Field>
          <Field label="Medication"><SelectInput value={form.medicationId} onChange={(v) => setForm((c) => ({ ...c, medicationId: v }))} options={medications.data.map((m) => ({ value: m.MedicationID, label: m.MedicationName }))} /></Field>
          <div className="form-grid">
            <Field label="Dosage"><TextInput value={form.dosage} onChange={(v) => setForm((c) => ({ ...c, dosage: v }))} /></Field>
            <Field label="Frequency"><TextInput value={form.frequency} onChange={(v) => setForm((c) => ({ ...c, frequency: v }))} /></Field>
          </div>
          <button type="submit"><Save size={18} />Save IPD prescription</button>
          {message && <p className="success">{message}</p>}
        </form>
      </article>
    </>
  );
}

export function OrderIpdTestsPage({ user }) {
  const admissions = useApi("/ipd/admissions");
  const tests = useApi("/tests");
  const [form, setForm] = useState({ admissionId: "", testId: "", results: "" });
  const [message, setMessage] = useState("");
  const mine = admissions.data.filter((a) => !user.doctorId || a.AttendingDoctorID === user.doctorId);

  const submit = async (event) => {
    event.preventDefault();
    const selected = mine.find((a) => String(a.AdmissionID) === String(form.admissionId));
    await api.post("/tests/orders/ipd", {
      admissionId: Number(form.admissionId),
      patientId: selected.PatientID,
      testId: Number(form.testId),
      status: "Ordered",
      results: form.results
    });
    setMessage("IPD test ordered.");
  };

  return (
    <>
      <PageHeader eyebrow="Doctor" title="Order IPD Tests" icon={FlaskConical} />
      <article className="data-panel form-panel">
        <form onSubmit={submit}>
          <Field label="Admission"><SelectInput value={form.admissionId} onChange={(v) => setForm((c) => ({ ...c, admissionId: v }))} options={mine.map((a) => ({ value: a.AdmissionID, label: `#${a.AdmissionID} ${a.PatientName}` }))} required /></Field>
          <Field label="Test"><SelectInput value={form.testId} onChange={(v) => setForm((c) => ({ ...c, testId: v }))} options={tests.data.map((t) => ({ value: t.TestID, label: t.TestName }))} required /></Field>
          <Field label="Initial results"><TextInput value={form.results} onChange={(v) => setForm((c) => ({ ...c, results: v }))} /></Field>
          <button type="submit"><Save size={18} />Order IPD test</button>
          {message && <p className="success">{message}</p>}
        </form>
      </article>
    </>
  );
}

export function AssignedWardPage() {
  const admissions = useApi("/ipd/admissions");
  return (
    <>
      <PageHeader eyebrow="Nurse" title="Assigned Ward View" icon={BedDouble} />
      <DataTable rows={admissions.data} columns={[{ key: "WardName", label: "Ward" }, { key: "BedNumber", label: "Bed" }, { key: "PatientName", label: "Patient" }, { key: "Status", label: "Status" }]} />
    </>
  );
}

export function BedStatusPage() {
  const beds = useApi("/departments/beds");
  const [form, setForm] = useState({ bedId: "", status: "Available" });
  const [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    await api.patch(`/departments/beds/${form.bedId}/status`, { status: form.status });
    setMessage("Bed status updated.");
    beds.reload();
  };
  return (
    <>
      <PageHeader eyebrow="Nurse" title="Update Bed Status" icon={BedDouble} />
      <section className="workspace-grid">
        <article className="data-panel">
          <form onSubmit={submit}>
            <Field label="Bed"><SelectInput value={form.bedId} onChange={(v) => setForm((c) => ({ ...c, bedId: v }))} options={beds.data.map((b) => ({ value: b.BedID, label: `${b.WardName} - ${b.BedNumber}` }))} required /></Field>
            <Field label="Status"><SelectInput value={form.status} onChange={(v) => setForm((c) => ({ ...c, status: v }))} options={["Available", "Occupied", "Maintenance"].map((s) => ({ value: s, label: s }))} required /></Field>
            <button type="submit"><Save size={18} />Update status</button>
            {message && <p className="success">{message}</p>}
          </form>
        </article>
        <article className="data-panel wide-panel">
          <DataTable rows={beds.data} columns={[{ key: "BedID", label: "ID" }, { key: "WardName", label: "Ward" }, { key: "BedNumber", label: "Bed" }, { key: "Status", label: "Status" }]} />
        </article>
      </section>
    </>
  );
}

export function NurseDutyRosterPage({ user }) {
  const roster = useApi("/departments/duty-roster");
  const rows = roster.data.filter((r) => !user.userId || r.UserID === user.userId);
  return (
    <>
      <PageHeader eyebrow="Nurse" title="Duty Roster View" icon={CalendarDays} />
      <DataTable rows={rows} columns={[{ key: "RosterID", label: "ID" }, { key: "DepartmentName", label: "Department" }, { key: "ShiftDate", label: "Date" }, { key: "ShiftType", label: "Shift" }, { key: "Status", label: "Status" }]} />
    </>
  );
}

export function PlaceholderPage({ title, role }) {
  return (
    <>
      <PageHeader eyebrow={role} title={title} icon={Activity} />
      <article className="data-panel form-panel">
        <p className="muted">This page is mapped in the role navigation and ready for the next implementation pass.</p>
      </article>
    </>
  );
}

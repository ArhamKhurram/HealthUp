import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BedDouble,
  CalendarDays,
  ClipboardPlus,
  CreditCard,
  Eye,
  EyeOff,
  FlaskConical,
  Pill,
  Save,
  Star,
  Stethoscope,
  UserPlus,
  Users
} from "lucide-react";
import api from "../api/client";

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

const emptyUser = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "Nurse",
  phone: "",
  address: "",
  profile: {
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    emergencyContact: "",
    allergies: "",
    chronicConditions: "",
    specialization: "",
    qualification: "",
    designation: "",
    consultationFee: 0,
    scheduleDays: [1, 2, 3, 4, 5],
    startTime: "09:00",
    endTime: "17:00",
    departmentId: "",
    shiftStartTime: "09:00",
    shiftEndTime: "17:00"
  }
};

const roleOptions = ["Receptionist", "Doctor", "Nurse", "Patient"];
const editRoleOptions = ["Admin", ...roleOptions];
const genderOptions = ["M", "F", "Other"];
const bloodGroupOptions = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
const doctorSpecializationOptions = ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "General Medicine", "Dermatology", "ENT"];
const doctorQualificationOptions = ["MBBS", "BDS", "FCPS", "MS", "MD"];
const doctorDesignationOptions = ["Consultant", "Specialist", "Resident", "Senior Registrar"];
const weekDays = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" }
];
const departmentTypeOptions = ["Clinical", "Surgical", "Diagnostics", "Support"];
const departmentLocationOptions = ["Ground Floor", "First Floor", "Second Floor", "Third Floor", "East Wing", "West Wing"];
const wardTypeOptions = ["General", "Private", "ICU", "Isolation"];
const bedTypeOptions = ["General", "Semi-Private", "Private", "ICU", "Isolation"];
const bedStatusOptions = ["Available", "Occupied", "Reserved", "Maintenance"];
const opdRoomTypeOptions = ["Consultation", "Procedure", "Emergency"];
const opdRoomStatusOptions = ["Available", "Occupied", "Maintenance"];
const dutyShiftOptions = ["Morning", "Evening", "Night"];
const medicationCategoryOptions = ["Antibiotic", "Analgesic", "Antipyretic", "Antiseptic", "Other"];
const medicationFormOptions = ["Tablet", "Capsule", "Syrup", "Injection", "Ointment"];
const testCategoryOptions = ["Pathology", "Radiology", "Cardiology", "Microbiology"];
const equipmentStatusOptions = ["Available", "In Use", "Maintenance", "Out of Service"];
const phoneRegex = /^03\d{9}$/;

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
  const appointments = useApi("/opd/appointments");
  const opdPayments = useApi("/billing/opd-payments");

  const roleCounts = useMemo(() => {
    return users.data.reduce(
      (acc, user) => {
        const role = user.Role || "";
        if (role === "Admin") acc.admins += 1;
        else if (role === "Patient") acc.patients += 1;
        else if (role === "Doctor") acc.doctors += 1;
        else if (role === "Nurse") acc.nurses += 1;
        else if (role === "Receptionist") acc.receptionists += 1;
        else acc.otherRoles += 1;
        return acc;
      },
      { admins: 0, patients: 0, doctors: 0, nurses: 0, receptionists: 0, otherRoles: 0 }
    );
  }, [users.data]);

  const roleTotal =
    roleCounts.admins +
    roleCounts.patients +
    roleCounts.doctors +
    roleCounts.nurses +
    roleCounts.receptionists +
    roleCounts.otherRoles;

  const revenue = opdPayments.data.reduce((sum, payment) => sum + Number(payment.PaidAmount || 0), 0);

  return (
    <>
      <PageHeader eyebrow="Admin" title="System Overview" icon={Activity} />
      <StatGrid
        stats={[
          { label: "Users", value: users.data.length },
          { label: "Admins", value: roleCounts.admins },
          { label: "Patients", value: roleCounts.patients },
          { label: "Doctors", value: roleCounts.doctors },
          { label: "Nurses", value: roleCounts.nurses },
          { label: "Receptionists", value: roleCounts.receptionists },
          { label: "Other / Unassigned Roles", value: roleCounts.otherRoles },
          { label: "Role Count Total", value: roleTotal },
          { label: "Appointments", value: appointments.data.length },
          { label: "OPD Revenue", value: `Rs ${revenue.toLocaleString()}` },
          { label: "SQL Server", value: "Online" }
        ]}
      />
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
  const canBookAppointment = user.role === "Receptionist" || user.role === "Admin";
  const [form, setForm] = useState({
    patientId: user.role === "Patient" ? user.patientId || "" : "",
    doctorId: "",
    appointmentDate: "",
    appointmentTime: "",
    appointmentType: "Consultation",
    chiefComplaint: ""
  });
  const [slots, setSlots] = useState([]);
  const [slotMessage, setSlotMessage] = useState("");
  const [message, setMessage] = useState("");
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    const loadSlots = async () => {
      if (!form.doctorId || !form.appointmentDate) {
        setSlots([]);
        setSlotMessage("");
        return;
      }
      try {
        const { data } = await api.get(`/opd/doctors/${form.doctorId}/available-slots`, {
          params: { date: form.appointmentDate }
        });
        setSlots(data);
        setSlotMessage(data.length ? "" : "No slots available for this doctor on selected date.");
      } catch (error) {
        setSlots([]);
        setSlotMessage(error.response?.data?.message || "Unable to load available slots.");
      }
    };
    loadSlots();
  }, [form.doctorId, form.appointmentDate]);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    const appointmentDateTime = form.appointmentDate && form.appointmentTime ? `${form.appointmentDate}T${form.appointmentTime}` : "";
    await api.post("/opd/appointments", {
      ...form,
      appointmentDate: appointmentDateTime,
      patientId: Number(form.patientId),
      doctorId: Number(form.doctorId)
    });
    setMessage("Appointment booked.");
    setForm({
      patientId: "",
      doctorId: "",
      appointmentDate: "",
      appointmentTime: "",
      appointmentType: "Consultation",
      chiefComplaint: ""
    });
    appointments.reload();
  };

  return (
    <>
      <PageHeader eyebrow={user.role} title="Book OPD Appointment" icon={CalendarDays} />
      <section className="workspace-grid">
        <article className="data-panel">
          <header><div><CalendarDays size={20} /><h2>{canBookAppointment ? "New Appointment" : "Appointment Flow"}</h2></div></header>
          <p className="muted">Only 30-minute slots within doctor schedule are allowed.</p>
          <button type="button" className="ghost-button" onClick={() => doctors.reload()}>Refresh doctor list</button>
          {canBookAppointment ? (
            <form onSubmit={submit}>
              <Field label="Patient">
                <SelectInput
                  value={form.patientId}
                  onChange={(value) => update("patientId", value)}
                  required
                  options={patients.data.map((patient) => ({ value: patient.PatientID, label: `${patient.FullName} (${patient.MRNumber})` }))}
                />
              </Field>
              <Field label="Doctor">
                <SelectInput
                  value={form.doctorId}
                  onChange={(value) => {
                    update("doctorId", value);
                    update("appointmentTime", "");
                  }}
                  required
                  options={doctors.data.map((doctor) => ({ value: doctor.DoctorID, label: `${doctor.FullName} - ${doctor.Specialization}` }))}
                />
              </Field>
              <Field label="Appointment date">
                <TextInput type="date" value={form.appointmentDate} onChange={(value) => {
                  update("appointmentDate", value);
                  update("appointmentTime", "");
                }} required />
              </Field>
              <Field label="Available slot">
                <SelectInput
                  value={form.appointmentTime}
                  onChange={(value) => update("appointmentTime", value)}
                  required
                  options={slots.map((slot) => ({ value: slot.time, label: slot.time }))}
                />
              </Field>
              {slotMessage && <p className="muted">{slotMessage}</p>}
              <Field label="Chief complaint"><TextInput value={form.chiefComplaint} onChange={(value) => update("chiefComplaint", value)} /></Field>
              <button type="submit" disabled={!form.appointmentTime}><Save size={18} />Book appointment</button>
              {message && <p className="success">{message}</p>}
            </form>
          ) : (
            <p className="muted">Appointments are booked at reception. Use this page to review scheduled appointments.</p>
          )}
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
  const patientId = Number(user.patientId);
  const appointments = useApi("/opd/appointments");
  const payments = useApi("/billing/opd-payments");
  const prescriptions = useApi("/opd/prescriptions");
  const myAppointments = appointments.data.filter((appointment) => Number(appointment.PatientID) === patientId);
  const myPayments = payments.data.filter((payment) => Number(payment.PatientID) === patientId);
  const myPrescriptions = prescriptions.data.filter((prescription) => Number(prescription.PatientID) === patientId);
  const hasError = appointments.error || payments.error || prescriptions.error;

  return (
    <>
      <PageHeader eyebrow="Patient" title="My HealthUp" icon={Users} />
      {hasError && <p className="error">Some dashboard data could not be loaded. Please refresh in a moment.</p>}
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
  const patientId = Number(user.patientId);
  const appointments = useApi("/opd/appointments");
  const rows = appointments.data.filter((appointment) => Number(appointment.PatientID) === patientId);

  if (appointments.loading) {
    return (
      <>
        <PageHeader eyebrow="Patient" title="My Appointments" icon={CalendarDays} />
        <article className="data-panel patient-panel-state"><p className="muted">Loading your appointments...</p></article>
      </>
    );
  }

  if (appointments.error) {
    return (
      <>
        <PageHeader eyebrow="Patient" title="My Appointments" icon={CalendarDays} />
        <article className="data-panel patient-panel-state"><p className="error">{appointments.error}</p></article>
      </>
    );
  }

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
          { key: "TotalAmount", label: "Total", render: (row) => `PKR ${Number(row.TotalAmount || 0).toLocaleString()}` },
          { key: "PaidAmount", label: "Paid", render: (row) => `PKR ${Number(row.PaidAmount || 0).toLocaleString()}` },
          { key: "Status", label: "Status" }
        ]}
      />
    </article>
  );
}

export function PaymentsPage({ user }) {
  const payments = useApi("/billing/opd-payments");
  const appointments = useApi("/opd/appointments");
  const canRecordPayment = user.role === "Receptionist";
  const [form, setForm] = useState({ appointmentId: "", patientId: user.role === "Patient" ? user.patientId || "" : "", totalAmount: 0, paidAmount: 0, status: "Pending" });
  const [message, setMessage] = useState("");
  const rows = user.role === "Patient" ? payments.data.filter((payment) => Number(payment.PatientID) === Number(user.patientId)) : payments.data;
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    await api.post("/billing/opd-payments", {
      appointmentId: Number(form.appointmentId),
      patientId: Number(form.patientId),
      totalAmount: Number(form.totalAmount),
      paidAmount: Number(form.paidAmount),
      status: form.status,
      details: [
        {
          itemType: "Consultation",
          amount: Number(form.totalAmount || 0),
          quantity: 1
        }
      ]
    });
    setMessage("Payment recorded.");
    setForm({ appointmentId: "", patientId: "", totalAmount: 0, paidAmount: 0, status: "Pending" });
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
        {canRecordPayment && (
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
                <SelectInput value={form.status} onChange={(value) => update("status", value)} options={["Pending", "Paid", "Rejected"].map((status) => ({ value: status, label: status }))} />
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
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState({ departmentName: "", departmentType: "", location: "" });
  const [editForm, setEditForm] = useState({ departmentId: "", departmentName: "", departmentType: "", location: "" });
  const isEditReady = Boolean(editForm.departmentId);
  const submit = async (event) => {
    event.preventDefault();
    await api.post("/departments", form);
    setForm({ departmentName: "", departmentType: "", location: "" });
    departments.reload();
  };
  const updateDepartment = async (event) => {
    event.preventDefault();
    if (!editForm.departmentId) return;
    await api.put(`/departments/${editForm.departmentId}`, {
      departmentName: editForm.departmentName,
      departmentType: editForm.departmentType,
      location: editForm.location
    });
    departments.reload();
  };
  const toggleMode = (nextMode) => {
    setMode(nextMode);
    if (nextMode === "create") {
      setEditForm({ departmentId: "", departmentName: "", departmentType: "", location: "" });
    } else {
      setForm({ departmentName: "", departmentType: "", location: "" });
    }
  };
  return (
    <>
      <PageHeader eyebrow="Admin" title="Departments Management" icon={Activity} />
      <article className="data-panel">
        <div className="mode-switch" role="tablist" aria-label="Department form mode">
          <button type="button" className={mode === "create" ? "active" : ""} onClick={() => toggleMode("create")}>Create</button>
          <button type="button" className={mode === "edit" ? "active" : ""} onClick={() => toggleMode("edit")}>Edit</button>
        </div>
        {mode === "create" ? (
          <form onSubmit={submit}>
            <Field label="Department name"><TextInput value={form.departmentName} onChange={(value) => setForm((c) => ({ ...c, departmentName: value }))} required /></Field>
            <Field label="Department type"><SelectInput value={form.departmentType} onChange={(value) => setForm((c) => ({ ...c, departmentType: value }))} options={departmentTypeOptions.map((type) => ({ value: type, label: type }))} required /></Field>
            <Field label="Location"><SelectInput value={form.location} onChange={(value) => setForm((c) => ({ ...c, location: value }))} options={departmentLocationOptions.map((location) => ({ value: location, label: location }))} /></Field>
            <button type="submit"><Save size={18} />Create department</button>
          </form>
        ) : (
          <form onSubmit={updateDepartment}>
            <Field label="Department"><SelectInput value={editForm.departmentId} onChange={(value) => {
              const selected = departments.data.find((department) => String(department.DepartmentID) === String(value));
              setEditForm({
                departmentId: value,
                departmentName: selected?.DepartmentName || "",
                departmentType: selected?.DepartmentType || "",
                location: selected?.Location || ""
              });
            }} options={departments.data.map((department) => ({ value: department.DepartmentID, label: department.DepartmentName }))} required /></Field>
            <Field label="Department name"><TextInput value={editForm.departmentName} onChange={(value) => setEditForm((current) => ({ ...current, departmentName: value }))} required={isEditReady} /></Field>
            <Field label="Department type"><SelectInput value={editForm.departmentType} onChange={(value) => setEditForm((current) => ({ ...current, departmentType: value }))} options={departmentTypeOptions.map((type) => ({ value: type, label: type }))} required={isEditReady} /></Field>
            <Field label="Location"><SelectInput value={editForm.location} onChange={(value) => setEditForm((current) => ({ ...current, location: value }))} options={departmentLocationOptions.map((location) => ({ value: location, label: location }))} /></Field>
            <button type="submit" disabled={!isEditReady}><Save size={18} />Update department</button>
          </form>
        )}
      </article>
      <section className="workspace-grid">
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
  const [mode, setMode] = useState("create");
  const [wardForm, setWardForm] = useState({ departmentId: "", wardName: "", wardType: "", totalBeds: 1, dailyCharges: 0 });
  const [wardEditForm, setWardEditForm] = useState({ wardId: "", departmentId: "", wardName: "", wardType: "", totalBeds: 1, dailyCharges: 0 });
  const [bedForm, setBedForm] = useState({ wardId: "", bedType: "", status: "Available", dailyCharges: 0 });
  const [bedEditForm, setBedEditForm] = useState({ bedId: "", wardId: "", bedNumber: "", bedType: "", status: "Available", dailyCharges: 0 });
  const [statusForm, setStatusForm] = useState({ bedId: "", status: "" });
  const isWardEditReady = Boolean(wardEditForm.wardId);
  const isBedEditReady = Boolean(bedEditForm.bedId);
  const isStatusReady = Boolean(statusForm.bedId);

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
  const updateWard = async (event) => {
    event.preventDefault();
    if (!wardEditForm.wardId) return;
    await api.put(`/departments/wards/${wardEditForm.wardId}`, { ...wardEditForm, departmentId: Number(wardEditForm.departmentId), totalBeds: Number(wardEditForm.totalBeds), dailyCharges: Number(wardEditForm.dailyCharges) });
    wards.reload();
  };
  const updateBed = async (event) => {
    event.preventDefault();
    if (!bedEditForm.bedId) return;
    await api.put(`/departments/beds/${bedEditForm.bedId}`, { ...bedEditForm, wardId: Number(bedEditForm.wardId), dailyCharges: Number(bedEditForm.dailyCharges) });
    beds.reload();
  };
  const updateBedStatus = async (event) => {
    event.preventDefault();
    if (!statusForm.bedId || !statusForm.status) return;
    await api.put(`/departments/beds/${statusForm.bedId}/status`, { status: statusForm.status });
    beds.reload();
  };
  const toggleMode = (nextMode) => {
    setMode(nextMode);
    if (nextMode === "create") {
      setWardEditForm({ wardId: "", departmentId: "", wardName: "", wardType: "", totalBeds: 1, dailyCharges: 0 });
      setBedEditForm({ bedId: "", wardId: "", bedNumber: "", bedType: "", status: "Available", dailyCharges: 0 });
    } else {
      setWardForm({ departmentId: "", wardName: "", wardType: "", totalBeds: 1, dailyCharges: 0 });
      setBedForm({ wardId: "", bedType: "", status: "Available", dailyCharges: 0 });
    }
    setStatusForm({ bedId: "", status: "" });
  };
  return (
    <>
      <PageHeader eyebrow="Admin" title="Wards & Beds Management" icon={BedDouble} />
      <article className="data-panel">
        <div className="mode-switch" role="tablist" aria-label="Wards and beds form mode">
          <button type="button" className={mode === "create" ? "active" : ""} onClick={() => toggleMode("create")}>Create</button>
          <button type="button" className={mode === "edit" ? "active" : ""} onClick={() => toggleMode("edit")}>Edit</button>
        </div>
      </article>
      <section className="workspace-grid">
        <article className="data-panel">
          <header><div><BedDouble size={20} /><h2>{mode === "create" ? "Create Ward" : "Edit Ward"}</h2></div></header>
          <form onSubmit={mode === "create" ? createWard : updateWard}>
            {mode === "edit" && (
              <Field label="Ward"><SelectInput value={wardEditForm.wardId} onChange={(value) => {
                const selected = wards.data.find((w) => String(w.WardID) === String(value));
                setWardEditForm({
                  wardId: value,
                  departmentId: selected?.DepartmentID || "",
                  wardName: selected?.WardName || "",
                  wardType: selected?.WardType || "",
                  totalBeds: selected?.TotalBeds || 1,
                  dailyCharges: selected?.DailyCharges || 0
                });
              }} options={wards.data.map((w) => ({ value: w.WardID, label: `${w.WardName} (${w.DepartmentName})` }))} required /></Field>
            )}
            <Field label="Department"><SelectInput value={mode === "create" ? wardForm.departmentId : wardEditForm.departmentId} onChange={(value) => (mode === "create" ? setWardForm((c) => ({ ...c, departmentId: value })) : setWardEditForm((c) => ({ ...c, departmentId: value })))} options={departments.data.map((d) => ({ value: d.DepartmentID, label: d.DepartmentName }))} required={mode === "create" || isWardEditReady} /></Field>
            <Field label="Ward name"><TextInput value={mode === "create" ? wardForm.wardName : wardEditForm.wardName} onChange={(value) => (mode === "create" ? setWardForm((c) => ({ ...c, wardName: value })) : setWardEditForm((c) => ({ ...c, wardName: value })))} required={mode === "create" || isWardEditReady} /></Field>
            <Field label="Ward type"><SelectInput value={mode === "create" ? wardForm.wardType : wardEditForm.wardType} onChange={(value) => (mode === "create" ? setWardForm((c) => ({ ...c, wardType: value })) : setWardEditForm((c) => ({ ...c, wardType: value })))} options={wardTypeOptions.map((type) => ({ value: type, label: type }))} required={mode === "create" || isWardEditReady} /></Field>
            <button type="submit" disabled={mode === "edit" && !isWardEditReady}><Save size={18} />{mode === "create" ? "Create ward" : "Update ward"}</button>
          </form>
        </article>
        <article className="data-panel">
          <header><div><BedDouble size={20} /><h2>{mode === "create" ? "Create Bed" : "Edit Bed"}</h2></div></header>
          <form onSubmit={mode === "create" ? createBed : updateBed}>
            {mode === "edit" && (
              <Field label="Bed"><SelectInput value={bedEditForm.bedId} onChange={(value) => {
                const selected = beds.data.find((b) => String(b.BedID) === String(value));
                setBedEditForm({
                  bedId: value,
                  wardId: selected?.WardID || "",
                  bedNumber: selected?.BedNumber || "",
                  bedType: selected?.BedType || "",
                  status: selected?.Status || "Available",
                  dailyCharges: selected?.DailyCharges || 0
                });
              }} options={beds.data.map((b) => ({ value: b.BedID, label: `${b.WardName} - ${b.BedNumber}` }))} required /></Field>
            )}
            <Field label="Ward"><SelectInput value={mode === "create" ? bedForm.wardId : bedEditForm.wardId} onChange={(value) => (mode === "create" ? setBedForm((c) => ({ ...c, wardId: value })) : setBedEditForm((c) => ({ ...c, wardId: value })))} options={wards.data.map((w) => ({ value: w.WardID, label: w.WardName }))} required={mode === "create" || isBedEditReady} /></Field>
            {mode === "create" ? (
              <Field label="Bed number">
                <input value="Auto-assigned (WardName-###)" readOnly disabled />
              </Field>
            ) : (
              <Field label="Bed number"><TextInput value={bedEditForm.bedNumber} onChange={(value) => setBedEditForm((c) => ({ ...c, bedNumber: value }))} required={isBedEditReady} /></Field>
            )}
            <Field label="Bed type"><SelectInput value={mode === "create" ? bedForm.bedType : bedEditForm.bedType} onChange={(value) => (mode === "create" ? setBedForm((c) => ({ ...c, bedType: value })) : setBedEditForm((c) => ({ ...c, bedType: value })))} options={bedTypeOptions.map((type) => ({ value: type, label: type }))} required={mode === "create" || isBedEditReady} /></Field>
            <Field label="Status"><SelectInput value={mode === "create" ? bedForm.status : bedEditForm.status} onChange={(value) => (mode === "create" ? setBedForm((c) => ({ ...c, status: value })) : setBedEditForm((c) => ({ ...c, status: value })))} options={bedStatusOptions.map((status) => ({ value: status, label: status }))} required={mode === "create" || isBedEditReady} /></Field>
            <button type="submit" disabled={mode === "edit" && !isBedEditReady}><Save size={18} />{mode === "create" ? "Create bed" : "Update bed"}</button>
          </form>
        </article>
        <article className="data-panel">
          <header><div><BedDouble size={20} /><h2>Update Bed Status</h2></div></header>
          <form onSubmit={updateBedStatus}>
            <Field label="Bed"><SelectInput value={statusForm.bedId} onChange={(value) => {
              const selected = beds.data.find((bed) => String(bed.BedID) === String(value));
              setStatusForm({ bedId: value, status: selected?.Status || "" });
            }} options={beds.data.map((bed) => ({ value: bed.BedID, label: `${bed.WardName} - ${bed.BedNumber}` }))} required /></Field>
            <Field label="Status"><SelectInput value={statusForm.status} onChange={(value) => setStatusForm((current) => ({ ...current, status: value }))} options={bedStatusOptions.map((status) => ({ value: status, label: status }))} required={isStatusReady} /></Field>
            <button type="submit" disabled={!isStatusReady || !statusForm.status}><Save size={18} />Update bed status</button>
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
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState({ departmentId: "", roomNumber: "", roomType: "", status: "Available", capacity: 1 });
  const [editForm, setEditForm] = useState({ roomId: "", departmentId: "", roomNumber: "", roomType: "", status: "Available", capacity: 1 });
  const [statusForm, setStatusForm] = useState({ roomId: "", status: "Available" });
  const submit = async (event) => {
    event.preventDefault();
    await api.post("/departments/opd-rooms", { ...form, departmentId: Number(form.departmentId), capacity: Number(form.capacity) });
    rooms.reload();
  };
  const updateStatus = async (event) => {
    event.preventDefault();
    await api.put(`/departments/opd-rooms/${statusForm.roomId}/status`, { status: statusForm.status });
    rooms.reload();
  };
  return (
    <>
      <PageHeader eyebrow="Admin" title="OPD Rooms Management" icon={CalendarDays} />
      <article className="data-panel">
        <div className="mode-switch" role="tablist" aria-label="OPD room form mode">
          <button type="button" className={mode === "create" ? "active" : ""} onClick={() => setMode("create")}>Create</button>
          <button type="button" className={mode === "edit" ? "active" : ""} onClick={() => setMode("edit")}>Edit</button>
        </div>
      </article>
      <section className="workspace-grid">
        <article className="data-panel">
          <form onSubmit={mode === "create" ? submit : async (event) => {
            event.preventDefault();
            await api.put(`/departments/opd-rooms/${editForm.roomId}`, { ...editForm, departmentId: Number(editForm.departmentId), capacity: Number(editForm.capacity) });
            rooms.reload();
          }}>
            {mode === "edit" && (
              <Field label="Room"><SelectInput value={editForm.roomId} onChange={(value) => {
                const selected = rooms.data.find((room) => String(room.RoomID) === String(value));
                setEditForm({
                  roomId: value,
                  departmentId: selected?.DepartmentID || "",
                  roomNumber: selected?.RoomNumber || "",
                  roomType: selected?.RoomType || "",
                  status: selected?.Status || "Available",
                  capacity: selected?.Capacity || 1
                });
              }} options={rooms.data.map((room) => ({ value: room.RoomID, label: `${room.DepartmentName} - ${room.RoomNumber}` }))} required /></Field>
            )}
            <Field label="Department"><SelectInput value={mode === "create" ? form.departmentId : editForm.departmentId} onChange={(value) => (mode === "create" ? setForm((c) => ({ ...c, departmentId: value })) : setEditForm((c) => ({ ...c, departmentId: value })))} options={departments.data.map((d) => ({ value: d.DepartmentID, label: d.DepartmentName }))} required /></Field>
            <Field label="Room number"><TextInput value={mode === "create" ? form.roomNumber : editForm.roomNumber} onChange={(value) => (mode === "create" ? setForm((c) => ({ ...c, roomNumber: value })) : setEditForm((c) => ({ ...c, roomNumber: value })))} required /></Field>
            <Field label="Room type"><SelectInput value={mode === "create" ? form.roomType : editForm.roomType} onChange={(value) => (mode === "create" ? setForm((c) => ({ ...c, roomType: value })) : setEditForm((c) => ({ ...c, roomType: value })))} options={opdRoomTypeOptions.map((type) => ({ value: type, label: type }))} required /></Field>
            <button type="submit"><Save size={18} />{mode === "create" ? "Create OPD room" : "Update OPD room"}</button>
          </form>
        </article>
        <article className="data-panel">
          <form onSubmit={updateStatus}>
            <Field label="Room"><SelectInput value={statusForm.roomId} onChange={(value) => setStatusForm((current) => ({ ...current, roomId: value }))} options={rooms.data.map((room) => ({ value: room.RoomID, label: `${room.DepartmentName} - ${room.RoomNumber}` }))} required /></Field>
            <Field label="Status"><SelectInput value={statusForm.status} onChange={(value) => setStatusForm((current) => ({ ...current, status: value }))} options={opdRoomStatusOptions.map((status) => ({ value: status, label: status }))} required /></Field>
            <button type="submit"><Save size={18} />Update room status</button>
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
  const [form, setForm] = useState({ userId: "", departmentId: "", shiftDate: "", shiftStartTime: "09:00", shiftEndTime: "17:00" });
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
            <Field label="Nurse user"><SelectInput value={form.userId} onChange={(value) => setForm((c) => ({ ...c, userId: value }))} options={users.data.filter((u) => u.Role === "Nurse").map((u) => ({ value: u.UserID, label: u.FullName }))} required /></Field>
            <Field label="Department"><SelectInput value={form.departmentId} onChange={(value) => setForm((c) => ({ ...c, departmentId: value }))} options={departments.data.map((d) => ({ value: d.DepartmentID, label: d.DepartmentName }))} required /></Field>
            <Field label="Shift date"><TextInput type="date" value={form.shiftDate} onChange={(value) => setForm((c) => ({ ...c, shiftDate: value }))} required /></Field>
            <Field label="Shift start"><TextInput type="time" value={form.shiftStartTime} onChange={(value) => setForm((c) => ({ ...c, shiftStartTime: value }))} required /></Field>
            <Field label="Shift end"><TextInput type="time" value={form.shiftEndTime} onChange={(value) => setForm((c) => ({ ...c, shiftEndTime: value }))} required /></Field>
            <button type="submit"><Save size={18} />Assign shift</button>
          </form>
        </article>
      </section>
      <section className="panel-grid">
        <article className="data-panel"><h2>Duty Roster</h2><DataTable rows={roster.data} columns={[{ key: "RosterID", label: "ID" }, { key: "FullName", label: "Staff" }, { key: "DepartmentName", label: "Department" }, { key: "ShiftDate", label: "Date", render: (row) => row.ShiftDate ? new Date(row.ShiftDate).toLocaleDateString() : "" }, { key: "ShiftStartTime", label: "Start", render: (row) => row.ShiftStartTime || "--" }, { key: "ShiftEndTime", label: "End", render: (row) => row.ShiftEndTime || "--" }]} /></article>
      </section>
    </>
  );
}

export function ManageUsersPage() {
  const users = useApi("/users");
  const departments = useApi("/departments");
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState(emptyUser);
  const [editForm, setEditForm] = useState({ userId: "", ...emptyUser, isActive: true });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const isEditReady = Boolean(editForm.userId);

  const resetCreateForm = () => setForm(emptyUser);
  const syncProfile = (current, nextRole) =>
    nextRole === current.role ? current.profile : { ...emptyUser.profile };

  const updateCreate = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateCreateProfile = (field, value) =>
    setForm((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));
  const updateEdit = (field, value) => setEditForm((current) => ({ ...current, [field]: value }));
  const updateEditProfile = (field, value) =>
    setEditForm((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));

  const patientFields = (state, updateProfile) => (
    <>
      <div className="form-grid">
        <Field label="Date of birth"><TextInput type="date" value={state.profile.dateOfBirth} onChange={(value) => updateProfile("dateOfBirth", value)} required /></Field>
        <Field label="Gender"><SelectInput value={state.profile.gender} onChange={(value) => updateProfile("gender", value)} options={genderOptions.map((value) => ({ value, label: value }))} required /></Field>
      </div>
      <div className="form-grid">
        <Field label="Blood group"><SelectInput value={state.profile.bloodGroup} onChange={(value) => updateProfile("bloodGroup", value)} options={bloodGroupOptions.map((value) => ({ value, label: value }))} /></Field>
        <Field label="Emergency contact"><TextInput value={state.profile.emergencyContact} onChange={(value) => updateProfile("emergencyContact", value)} /></Field>
      </div>
      <Field label="Allergies"><TextInput value={state.profile.allergies} onChange={(value) => updateProfile("allergies", value)} /></Field>
      <Field label="Chronic conditions"><TextInput value={state.profile.chronicConditions} onChange={(value) => updateProfile("chronicConditions", value)} /></Field>
    </>
  );

  const doctorFields = (state, updateProfile) => (
    <>
      <Field label="Specialization"><SelectInput value={state.profile.specialization} onChange={(value) => updateProfile("specialization", value)} options={doctorSpecializationOptions.map((value) => ({ value, label: value }))} required /></Field>
      <div className="form-grid">
        <Field label="Qualification"><SelectInput value={state.profile.qualification} onChange={(value) => updateProfile("qualification", value)} options={doctorQualificationOptions.map((value) => ({ value, label: value }))} /></Field>
        <Field label="Designation"><SelectInput value={state.profile.designation} onChange={(value) => updateProfile("designation", value)} options={doctorDesignationOptions.map((value) => ({ value, label: value }))} /></Field>
      </div>
      <div className="form-grid">
        <Field label="Consultation fee"><TextInput type="number" value={state.profile.consultationFee} onChange={(value) => updateProfile("consultationFee", Number(value || 0))} /></Field>
        <Field label="Shift start"><TextInput type="time" value={state.profile.startTime} onChange={(value) => updateProfile("startTime", value)} /></Field>
      </div>
      <div className="form-grid">
        <Field label="Shift end"><TextInput type="time" value={state.profile.endTime} onChange={(value) => updateProfile("endTime", value)} /></Field>
        <Field label="Schedule days">
          <div className="days-grid">
            {weekDays.map((day) => {
              const selected = state.profile.scheduleDays?.includes(day.value);
              return (
                <button
                  type="button"
                  key={day.value}
                  className={selected ? "day-chip active" : "day-chip"}
                  onClick={() => {
                    const current = state.profile.scheduleDays || [];
                    const next = selected ? current.filter((value) => value !== day.value) : [...current, day.value];
                    updateProfile("scheduleDays", next.sort((a, b) => a - b));
                  }}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
      <p className="muted">Appointments use fixed 30-minute slots based on selected schedule.</p>
    </>
  );

  const nurseFields = (state, updateProfile) => (
    <>
      <Field label="Department">
        <SelectInput
          value={state.profile.departmentId}
          onChange={(value) => updateProfile("departmentId", value)}
          options={departments.data.map((department) => ({ value: department.DepartmentID, label: department.DepartmentName }))}
          required
        />
      </Field>
      <div className="form-grid">
        <Field label="Shift start"><TextInput type="time" value={state.profile.shiftStartTime} onChange={(value) => updateProfile("shiftStartTime", value)} /></Field>
        <Field label="Shift end"><TextInput type="time" value={state.profile.shiftEndTime} onChange={(value) => updateProfile("shiftEndTime", value)} /></Field>
      </div>
    </>
  );

  const renderRoleFields = (state, updateProfile) => {
    if (state.role === "Patient") return patientFields(state, updateProfile);
    if (state.role === "Doctor") return doctorFields(state, updateProfile);
    if (state.role === "Nurse") return nurseFields(state, updateProfile);
    return null;
  };

  const buildPayload = (state, includePassword) => {
    const payload = {
      fullName: state.fullName,
      email: state.email,
      role: state.role,
      phone: state.phone,
      address: state.address,
      profile: { ...state.profile }
    };
    if (includePassword && state.password) {
      payload.password = state.password;
      payload.confirmPassword = state.confirmPassword;
    }
    if (!includePassword && state.password) payload.password = state.password;
    if (state.role === "Nurse" && payload.profile.departmentId) {
      payload.profile.departmentId = Number(payload.profile.departmentId);
    }
    return payload;
  };

  const loadUserForEdit = (value) => {
    const selected = users.data.find((user) => String(user.UserID) === String(value));
    setEditForm({
      userId: value,
      fullName: selected?.FullName || "",
      email: selected?.Email || "",
      role: selected?.Role || "",
      phone: selected?.Phone || "",
      address: selected?.Address || "",
      isActive: selected?.IsActive ?? true,
      password: "",
      confirmPassword: "",
      profile: { ...emptyUser.profile }
    });
    if (value) {
      api.get(`/users/${value}`).then(({ data }) => {
        setEditForm((current) => ({
          ...current,
          profile: {
            ...emptyUser.profile,
            dateOfBirth: data.profile?.DateOfBirth ? String(data.profile.DateOfBirth).slice(0, 10) : "",
            gender: data.profile?.Gender || "",
            bloodGroup: data.profile?.BloodGroup || "",
            emergencyContact: data.profile?.EmergencyContact || "",
            allergies: data.profile?.Allergies || "",
            chronicConditions: data.profile?.ChronicConditions || "",
            specialization: data.profile?.Specialization || "",
            qualification: data.profile?.Qualification || "",
            designation: data.profile?.Designation || "",
            consultationFee: data.profile?.ConsultationFee || 0,
            scheduleDays: data.profile?.ScheduleDays || [1, 2, 3, 4, 5],
            startTime: data.profile?.StartTime || "09:00",
            endTime: data.profile?.EndTime || "17:00",
            departmentId: data.profile?.DepartmentID || "",
            shiftStartTime: data.profile?.ShiftStartTime || "09:00",
            shiftEndTime: data.profile?.ShiftEndTime || "17:00"
          }
        }));
      });
    }
  };

  const checkPasswords = (state) => {
    if (!state.password || state.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    if (state.password !== state.confirmPassword) {
      setError("Password and confirm password do not match.");
      return false;
    }
    return true;
  };

  const validatePhone = (value) => {
    if (!value) return true;
    return phoneRegex.test(String(value).trim());
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!validatePhone(form.phone)) {
      setError("Phone must be 11 digits starting with 0 (e.g., 03001234567).");
      return;
    }
    if (!checkPasswords(form)) return;
    try {
      await api.post("/users", buildPayload(form, true));
      setMessage("User created.");
      resetCreateForm();
      users.reload();
    } catch (requestError) {
      const serverMessage = requestError.response?.data?.message;
      const fieldErrors = requestError.response?.data?.errors;
      if (Array.isArray(fieldErrors) && fieldErrors.length) {
        setError(fieldErrors.map((item) => item.message).join(" "));
      } else {
        setError(serverMessage || "Unable to create user.");
      }
    }
  };

  const updateUser = async (event) => {
    event.preventDefault();
    if (!editForm.userId) return;
    setError("");
    setMessage("");
    if (!validatePhone(editForm.phone)) {
      setError("Phone must be 11 digits starting with 0 (e.g., 03001234567).");
      return;
    }
    if (editForm.password || editForm.confirmPassword) {
      if (!checkPasswords(editForm)) return;
    }
    try {
      await api.put(`/users/${editForm.userId}`, {
        ...buildPayload(editForm, false),
        isActive: editForm.isActive,
        password: editForm.password || undefined
      });
      setMessage("User updated.");
      users.reload();
    } catch (requestError) {
      const serverMessage = requestError.response?.data?.message;
      const fieldErrors = requestError.response?.data?.errors;
      if (Array.isArray(fieldErrors) && fieldErrors.length) {
        setError(fieldErrors.map((item) => item.message).join(" "));
      } else {
        setError(serverMessage || "Unable to update user.");
      }
    }
  };
  const toggleMode = (nextMode) => {
    setMode(nextMode);
    setMessage("");
    setError("");
    if (nextMode === "create") {
      setEditForm({ userId: "", ...emptyUser, isActive: true });
    } else {
      resetCreateForm();
    }
  };
  return (
    <>
      <PageHeader eyebrow="Admin" title="Manage Users" icon={Users} />
      <article className="data-panel">
        <div className="mode-switch" role="tablist" aria-label="User form mode">
          <button type="button" className={mode === "create" ? "active" : ""} onClick={() => toggleMode("create")}>Create</button>
          <button type="button" className={mode === "edit" ? "active" : ""} onClick={() => toggleMode("edit")}>Edit</button>
        </div>

        {mode === "create" ? (
          <form onSubmit={submit}>
            <Field label="Role">
              <SelectInput value={form.role} onChange={(value) => setForm((current) => ({ ...current, role: value, profile: syncProfile(current, value) }))} options={roleOptions.map((role) => ({ value: role, label: role }))} required />
            </Field>
            <Field label="Full name"><TextInput value={form.fullName} onChange={(value) => updateCreate("fullName", value)} required /></Field>
            <Field label="Email"><TextInput type="email" value={form.email} onChange={(value) => updateCreate("email", value)} required /></Field>
            <Field label="Phone"><TextInput value={form.phone} onChange={(value) => updateCreate("phone", value)} /></Field>
            <Field label="Address"><TextInput value={form.address} onChange={(value) => updateCreate("address", value)} /></Field>
            <div className="form-grid">
              <Field label="Password">
                <div className="password-field">
                  <TextInput type={showCreatePassword ? "text" : "password"} value={form.password} onChange={(value) => updateCreate("password", value)} required />
                  <button type="button" className="icon-button" onClick={() => setShowCreatePassword((current) => !current)}>{showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </Field>
              <Field label="Confirm password">
                <div className="password-field">
                  <TextInput type={showCreateConfirm ? "text" : "password"} value={form.confirmPassword} onChange={(value) => updateCreate("confirmPassword", value)} required />
                  <button type="button" className="icon-button" onClick={() => setShowCreateConfirm((current) => !current)}>{showCreateConfirm ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </Field>
            </div>
            {renderRoleFields(form, updateCreateProfile)}
            <button type="submit"><Save size={18} />Create user</button>
          </form>
        ) : (
          <form onSubmit={updateUser}>
            <Field label="User"><SelectInput value={editForm.userId} onChange={loadUserForEdit} options={users.data.map((user) => ({ value: user.UserID, label: `${user.FullName} (${user.Role})` }))} required /></Field>
            <Field label="Role"><SelectInput value={editForm.role} onChange={(value) => updateEdit("role", value)} options={editRoleOptions.map((role) => ({ value: role, label: role }))} required={isEditReady} /></Field>
            <Field label="Full name"><TextInput value={editForm.fullName} onChange={(value) => updateEdit("fullName", value)} required={isEditReady} /></Field>
            <Field label="Email"><TextInput type="email" value={editForm.email} onChange={(value) => updateEdit("email", value)} required={isEditReady} /></Field>
            <Field label="Phone"><TextInput value={editForm.phone} onChange={(value) => updateEdit("phone", value)} /></Field>
            <Field label="Address"><TextInput value={editForm.address} onChange={(value) => updateEdit("address", value)} /></Field>
            <Field label="Account active">
              <SelectInput value={editForm.isActive ? "1" : "0"} onChange={(value) => updateEdit("isActive", value === "1")} options={[{ value: "1", label: "Active" }, { value: "0", label: "Inactive" }]} />
            </Field>
            <div className="form-grid">
              <Field label="New password (optional)">
                <div className="password-field">
                  <TextInput type={showEditPassword ? "text" : "password"} value={editForm.password} onChange={(value) => updateEdit("password", value)} />
                  <button type="button" className="icon-button" onClick={() => setShowEditPassword((current) => !current)}>{showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </Field>
              <Field label="Confirm new password">
                <div className="password-field">
                  <TextInput type={showEditConfirm ? "text" : "password"} value={editForm.confirmPassword} onChange={(value) => updateEdit("confirmPassword", value)} />
                  <button type="button" className="icon-button" onClick={() => setShowEditConfirm((current) => !current)}>{showEditConfirm ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </Field>
            </div>
            {renderRoleFields(editForm, updateEditProfile)}
            <button type="submit" disabled={!isEditReady}><Save size={18} />Update user</button>
          </form>
        )}

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </article>
      <article className="data-panel wide-panel">
        <DataTable rows={users.data} columns={[{ key: "UserID", label: "ID" }, { key: "FullName", label: "Name" }, { key: "Email", label: "Email" }, { key: "Role", label: "Role" }, { key: "Phone", label: "Phone" }, { key: "IsActive", label: "Active", render: (row) => (row.IsActive ? "Yes" : "No") }]} />
      </article>
    </>
  );
}

export function MedicationsManagement() {
  const medications = useApi("/pharmacy/medications");
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState({ medicationName: "", genericName: "", category: "", unitPrice: 0, form: "", quantityInStock: 0, minimumStockLevel: 0, reorderLevel: 0, expiryDate: "" });
  const [editForm, setEditForm] = useState({ medicationId: "", medicationName: "", genericName: "", category: "", unitPrice: 0, form: "", quantityInStock: 0, minimumStockLevel: 0, reorderLevel: 0, expiryDate: "" });
  const createMedication = async (event) => {
    event.preventDefault();
    await api.post("/pharmacy/medications", { ...form, unitPrice: Number(form.unitPrice), quantityInStock: Number(form.quantityInStock), minimumStockLevel: Number(form.minimumStockLevel), reorderLevel: Number(form.reorderLevel) });
    medications.reload();
  };
  const updateMedication = async (event) => {
    event.preventDefault();
    await api.put(`/pharmacy/medications/${editForm.medicationId}`, { ...editForm, unitPrice: Number(editForm.unitPrice), quantityInStock: Number(editForm.quantityInStock), minimumStockLevel: Number(editForm.minimumStockLevel), reorderLevel: Number(editForm.reorderLevel) });
    medications.reload();
  };
  return (
    <>
      <PageHeader eyebrow="Admin" title="Medications Management" icon={Pill} />
      <article className="data-panel">
        <div className="mode-switch" role="tablist" aria-label="Medication form mode">
          <button type="button" className={mode === "create" ? "active" : ""} onClick={() => setMode("create")}>Create</button>
          <button type="button" className={mode === "edit" ? "active" : ""} onClick={() => setMode("edit")}>Edit</button>
        </div>
      </article>
      <section className="workspace-grid">
        {mode === "create" && <article className="data-panel">
          <form onSubmit={createMedication}>
            <Field label="Medication name"><TextInput value={form.medicationName} onChange={(value) => setForm((current) => ({ ...current, medicationName: value }))} required /></Field>
            <Field label="Category"><SelectInput value={form.category} onChange={(value) => setForm((current) => ({ ...current, category: value }))} options={medicationCategoryOptions.map((category) => ({ value: category, label: category }))} /></Field>
            <Field label="Form"><SelectInput value={form.form} onChange={(value) => setForm((current) => ({ ...current, form: value }))} options={medicationFormOptions.map((formValue) => ({ value: formValue, label: formValue }))} /></Field>
            <Field label="Unit price"><TextInput type="number" value={form.unitPrice} onChange={(value) => setForm((current) => ({ ...current, unitPrice: value }))} required /></Field>
            <Field label="In stock"><TextInput type="number" value={form.quantityInStock} onChange={(value) => setForm((current) => ({ ...current, quantityInStock: value }))} /></Field>
            <button type="submit"><Save size={18} />Create medication</button>
          </form>
        </article>}
        {mode === "edit" && <article className="data-panel">
          <form onSubmit={updateMedication}>
            <Field label="Medication"><SelectInput value={editForm.medicationId} onChange={(value) => {
              const selected = medications.data.find((medication) => String(medication.MedicationID) === String(value));
              setEditForm({
                medicationId: value,
                medicationName: selected?.MedicationName || "",
                genericName: selected?.GenericName || "",
                category: selected?.Category || "",
                unitPrice: selected?.UnitPrice || 0,
                form: selected?.Form || "",
                quantityInStock: selected?.QuantityInStock || 0,
                minimumStockLevel: selected?.MinimumStockLevel || 0,
                reorderLevel: selected?.ReorderLevel || 0,
                expiryDate: selected?.ExpiryDate ? String(selected.ExpiryDate).slice(0, 10) : ""
              });
            }} options={medications.data.map((medication) => ({ value: medication.MedicationID, label: medication.MedicationName }))} required /></Field>
            <Field label="Medication name"><TextInput value={editForm.medicationName} onChange={(value) => setEditForm((current) => ({ ...current, medicationName: value }))} required /></Field>
            <Field label="Category"><SelectInput value={editForm.category} onChange={(value) => setEditForm((current) => ({ ...current, category: value }))} options={medicationCategoryOptions.map((category) => ({ value: category, label: category }))} /></Field>
            <Field label="Form"><SelectInput value={editForm.form} onChange={(value) => setEditForm((current) => ({ ...current, form: value }))} options={medicationFormOptions.map((formValue) => ({ value: formValue, label: formValue }))} /></Field>
            <Field label="Unit price"><TextInput type="number" value={editForm.unitPrice} onChange={(value) => setEditForm((current) => ({ ...current, unitPrice: value }))} required /></Field>
            <Field label="In stock"><TextInput type="number" value={editForm.quantityInStock} onChange={(value) => setEditForm((current) => ({ ...current, quantityInStock: value }))} /></Field>
            <button type="submit"><Save size={18} />Update medication</button>
          </form>
        </article>}
      </section>
      <article className="data-panel wide-panel">
        <DataTable rows={medications.data} columns={[{ key: "MedicationID", label: "ID" }, { key: "MedicationName", label: "Medication" }, { key: "Category", label: "Category" }, { key: "UnitPrice", label: "Price", render: (row) => `PKR ${Number(row.UnitPrice || 0).toLocaleString()}` }, { key: "QuantityInStock", label: "Stock" }]} />
      </article>
    </>
  );
}

export function MedicalTestsManagement() {
  const tests = useApi("/tests");
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState({ testName: "", testCode: "", category: "", cost: 0 });
  const [editForm, setEditForm] = useState({ testId: "", testName: "", testCode: "", category: "", cost: 0 });
  const createTest = async (event) => {
    event.preventDefault();
    await api.post("/tests", { ...form, cost: Number(form.cost) });
    tests.reload();
  };
  const updateTest = async (event) => {
    event.preventDefault();
    await api.put(`/tests/${editForm.testId}`, { testName: editForm.testName, testCode: editForm.testCode, category: editForm.category, cost: Number(editForm.cost) });
    tests.reload();
  };
  return (
    <>
      <PageHeader eyebrow="Admin" title="Medical Tests Management" icon={FlaskConical} />
      <article className="data-panel">
        <div className="mode-switch" role="tablist" aria-label="Medical test form mode">
          <button type="button" className={mode === "create" ? "active" : ""} onClick={() => setMode("create")}>Create</button>
          <button type="button" className={mode === "edit" ? "active" : ""} onClick={() => setMode("edit")}>Edit</button>
        </div>
      </article>
      <section className="workspace-grid">
        {mode === "create" && <article className="data-panel">
          <form onSubmit={createTest}>
            <Field label="Test name"><TextInput value={form.testName} onChange={(value) => setForm((current) => ({ ...current, testName: value }))} required /></Field>
            <Field label="Code"><TextInput value={form.testCode} onChange={(value) => setForm((current) => ({ ...current, testCode: value }))} required /></Field>
            <Field label="Category"><SelectInput value={form.category} onChange={(value) => setForm((current) => ({ ...current, category: value }))} options={testCategoryOptions.map((category) => ({ value: category, label: category }))} required /></Field>
            <Field label="Cost"><TextInput type="number" value={form.cost} onChange={(value) => setForm((current) => ({ ...current, cost: value }))} required /></Field>
            <button type="submit"><Save size={18} />Create test</button>
          </form>
        </article>}
        {mode === "edit" && <article className="data-panel">
          <form onSubmit={updateTest}>
            <Field label="Test"><SelectInput value={editForm.testId} onChange={(value) => {
              const selected = tests.data.find((test) => String(test.TestID) === String(value));
              setEditForm({ testId: value, testName: selected?.TestName || "", testCode: selected?.TestCode || "", category: selected?.Category || "", cost: selected?.Cost || 0 });
            }} options={tests.data.map((test) => ({ value: test.TestID, label: test.TestName }))} required /></Field>
            <Field label="Test name"><TextInput value={editForm.testName} onChange={(value) => setEditForm((current) => ({ ...current, testName: value }))} required /></Field>
            <Field label="Code"><TextInput value={editForm.testCode} onChange={(value) => setEditForm((current) => ({ ...current, testCode: value }))} required /></Field>
            <Field label="Category"><SelectInput value={editForm.category} onChange={(value) => setEditForm((current) => ({ ...current, category: value }))} options={testCategoryOptions.map((category) => ({ value: category, label: category }))} required /></Field>
            <Field label="Cost"><TextInput type="number" value={editForm.cost} onChange={(value) => setEditForm((current) => ({ ...current, cost: value }))} required /></Field>
            <button type="submit"><Save size={18} />Update test</button>
          </form>
        </article>}
      </section>
      <article className="data-panel wide-panel">
        <DataTable rows={tests.data} columns={[{ key: "TestID", label: "ID" }, { key: "TestName", label: "Name" }, { key: "TestCode", label: "Code" }, { key: "Category", label: "Category" }, { key: "Cost", label: "Cost", render: (row) => `PKR ${Number(row.Cost || 0).toLocaleString()}` }]} />
      </article>
    </>
  );
}

export function ReportsPage() {
  const patients = useApi("/reports/patients");
  const appointments = useApi("/reports/opd-appointments");
  const billing = useApi("/reports/billing");
  const totalBilled = billing.data.reduce((sum, row) => sum + Number(row.TotalAmount || 0), 0);
  const totalPaid = billing.data.reduce((sum, row) => sum + Number(row.PaidAmount || 0), 0);
  const pendingCount = billing.data.filter((row) => String(row.Status || "").toLowerCase() !== "paid").length;

  return (
    <>
      <PageHeader eyebrow="Admin" title="Reports" icon={Activity} />
      <StatGrid
        stats={[
          { label: "Patient Records", value: patients.data.length },
          { label: "OPD Appointments", value: appointments.data.length },
          { label: "Billing Entries", value: billing.data.length },
          { label: "Total Billed", value: `PKR ${totalBilled.toLocaleString()}` },
          { label: "Total Paid", value: `PKR ${totalPaid.toLocaleString()}` },
          { label: "Unsettled Bills", value: pendingCount }
        ]}
      />
      <section className="panel-grid">
        <article className="data-panel"><h2>Patient Directory</h2><DataTable rows={patients.data} empty="No patient records were returned for this report." columns={[{ key: "PatientID", label: "Patient ID" }, { key: "FullName", label: "Name" }, { key: "Email", label: "Email" }]} /></article>
        <article className="data-panel"><h2>OPD Appointments</h2><DataTable rows={appointments.data} empty="No OPD appointment rows are available for the selected report range." columns={[{ key: "AppointmentID", label: "Appt ID" }, { key: "PatientName", label: "Patient" }, { key: "DoctorName", label: "Doctor" }, { key: "AppointmentDate", label: "Date/Time", render: (row) => row.AppointmentDate ? new Date(row.AppointmentDate).toLocaleString() : "N/A" }, { key: "TokenNumber", label: "Token" }, { key: "Status", label: "Status" }]} /></article>
      </section>
      <article className="data-panel wide-panel">
        <h2>Billing Summary</h2>
        <DataTable rows={billing.data} empty="No billing rows were returned for this report." columns={[{ key: "PaymentID", label: "Payment ID" }, { key: "BillingType", label: "Type" }, { key: "PatientName", label: "Patient" }, { key: "TotalAmount", label: "Total", render: (row) => `PKR ${Number(row.TotalAmount || 0).toLocaleString()}` }, { key: "PaidAmount", label: "Paid", render: (row) => `PKR ${Number(row.PaidAmount || 0).toLocaleString()}` }, { key: "Status", label: "Status" }]} />
      </article>
    </>
  );
}

export function EquipmentManagement() {
  const departments = useApi("/departments");
  const equipment = useApi("/departments/equipment");
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState({ departmentId: "", equipmentName: "", status: "Available" });
  const [statusForm, setStatusForm] = useState({ equipmentId: "", status: "Available" });
  const submit = async (event) => {
    event.preventDefault();
    await api.post("/departments/equipment", { ...form, departmentId: Number(form.departmentId) });
    equipment.reload();
  };
  const updateStatus = async (event) => {
    event.preventDefault();
    await api.put(`/departments/equipment/${statusForm.equipmentId}/status`, { status: statusForm.status });
    equipment.reload();
  };
  return (
    <>
      <PageHeader eyebrow="Admin" title="Equipment Management" icon={Activity} />
      <article className="data-panel">
        <div className="mode-switch" role="tablist" aria-label="Equipment form mode">
          <button type="button" className={mode === "create" ? "active" : ""} onClick={() => setMode("create")}>Create</button>
          <button type="button" className={mode === "edit" ? "active" : ""} onClick={() => setMode("edit")}>Edit Status</button>
        </div>
      </article>
      <section className="workspace-grid">
        {mode === "create" && <article className="data-panel">
          <form onSubmit={submit}>
            <Field label="Department"><SelectInput value={form.departmentId} onChange={(value) => setForm((c) => ({ ...c, departmentId: value }))} options={departments.data.map((d) => ({ value: d.DepartmentID, label: d.DepartmentName }))} required /></Field>
            <Field label="Equipment name"><TextInput value={form.equipmentName} onChange={(value) => setForm((c) => ({ ...c, equipmentName: value }))} required /></Field>
            <button type="submit"><Save size={18} />Add equipment</button>
          </form>
        </article>}
        {mode === "edit" && <article className="data-panel">
          <form onSubmit={updateStatus}>
            <Field label="Equipment"><SelectInput value={statusForm.equipmentId} onChange={(value) => setStatusForm((current) => ({ ...current, equipmentId: value }))} options={equipment.data.map((item) => ({ value: item.EquipmentID, label: `${item.DepartmentName} - ${item.EquipmentName}` }))} required /></Field>
            <Field label="Status"><SelectInput value={statusForm.status} onChange={(value) => setStatusForm((current) => ({ ...current, status: value }))} options={equipmentStatusOptions.map((status) => ({ value: status, label: status }))} required /></Field>
            <button type="submit"><Save size={18} />Update status</button>
          </form>
        </article>}
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
  const tests = useApi("/tests/orders/opd");
  const rows = appointments.data.filter((a) => !user.doctorId || a.DoctorID === user.doctorId);
  const [selectedId, setSelectedId] = useState("");
  const selected = rows.find((item) => String(item.AppointmentID) === String(selectedId)) || rows[0];
  const selectedTests = tests.data.filter((item) => String(item.AppointmentID) === String(selected?.AppointmentID));

  useEffect(() => {
    if (!selectedId && rows.length) {
      setSelectedId(String(rows[0].AppointmentID));
    }
  }, [rows, selectedId]);

  return (
    <>
      <PageHeader eyebrow="Doctor" title="Appointment Details" icon={CalendarDays} />
      <section className="workspace-grid">
        <article className="data-panel">
          <header><div><CalendarDays size={20} /><h2>Appointment Queue</h2></div><span>{rows.length}</span></header>
          <Field label="Select appointment">
            <SelectInput
              value={selected?.AppointmentID || ""}
              onChange={(value) => setSelectedId(value)}
              options={rows.map((item) => ({
                value: item.AppointmentID,
                label: `#${item.AppointmentID} ${item.PatientName} - ${new Date(item.AppointmentDate).toLocaleString()}`
              }))}
            />
          </Field>
          <DataTable rows={rows} columns={[{ key: "AppointmentID", label: "ID" }, { key: "PatientName", label: "Patient" }, { key: "ChiefComplaint", label: "Complaint" }, { key: "Status", label: "Status" }]} />
        </article>
        <article className="data-panel wide-panel">
          <header><div><ClipboardPlus size={20} /><h2>Selected Appointment</h2></div></header>
          {!selected ? (
            <p className="muted">No appointment assigned.</p>
          ) : (
            <dl className="profile-list compact-list">
              <div><dt>ID</dt><dd>#{selected.AppointmentID}</dd></div>
              <div><dt>Patient</dt><dd>{selected.PatientName || "N/A"}</dd></div>
              <div><dt>Date & time</dt><dd>{selected.AppointmentDate ? new Date(selected.AppointmentDate).toLocaleString() : "N/A"}</dd></div>
              <div><dt>Type</dt><dd>{selected.AppointmentType || "N/A"}</dd></div>
              <div><dt>Complaint</dt><dd>{selected.ChiefComplaint || "Not provided"}</dd></div>
              <div><dt>Status</dt><dd>{selected.Status || "N/A"}</dd></div>
            </dl>
          )}
          <h3 className="panel-subtitle">Ordered Tests</h3>
          <DataTable
            rows={selectedTests}
            empty="No OPD tests ordered for this appointment."
            columns={[
              { key: "TestOrderID", label: "Order" },
              { key: "TestName", label: "Test" },
              { key: "Status", label: "Status" },
              { key: "Results", label: "Results" }
            ]}
          />
        </article>
      </section>
    </>
  );
}

export function OrderOpdTests({ user }) {
  const appointments = useApi("/opd/appointments");
  const tests = useApi("/tests");
  const [form, setForm] = useState({ appointmentId: "", testId: "", results: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const selected = appointments.data.find((a) => String(a.AppointmentID) === String(form.appointmentId));
    if (!selected) {
      setError("Select a valid appointment.");
      return;
    }
    try {
      await api.post("/tests/orders/opd", { appointmentId: Number(form.appointmentId), patientId: selected.PatientID, testId: Number(form.testId), results: form.results, status: "Ordered" });
      setMessage("OPD test ordered.");
      setForm({ appointmentId: "", testId: "", results: "" });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to order OPD test.");
    }
  };
  const options = appointments.data.filter((a) => !user.doctorId || a.DoctorID === user.doctorId);
  return (
    <>
      <PageHeader eyebrow="Doctor" title="Order OPD Tests" icon={FlaskConical} />
      <article className="data-panel form-panel"><form onSubmit={submit}>
        <Field label="Appointment"><SelectInput value={form.appointmentId} onChange={(v) => setForm((c) => ({ ...c, appointmentId: v }))} options={options.map((a) => ({ value: a.AppointmentID, label: `#${a.AppointmentID} ${a.PatientName}` }))} required /></Field>
        <Field label="Test"><SelectInput value={form.testId} onChange={(v) => setForm((c) => ({ ...c, testId: v }))} options={tests.data.map((t) => ({ value: t.TestID, label: t.TestName }))} required /></Field>
        <button type="submit"><Save size={18} />Order test</button>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </form></article>
    </>
  );
}

export function MyPrescriptions({ user }) {
  const patientId = Number(user.patientId);
  const prescriptions = useApi("/opd/prescriptions");
  const rows = prescriptions.data.filter((p) => Number(p.PatientID) === patientId);

  if (prescriptions.loading) {
    return (
      <>
        <PageHeader eyebrow="Patient" title="My Prescriptions" icon={ClipboardPlus} />
        <article className="data-panel patient-panel-state"><p className="muted">Loading your prescriptions...</p></article>
      </>
    );
  }

  if (prescriptions.error) {
    return (
      <>
        <PageHeader eyebrow="Patient" title="My Prescriptions" icon={ClipboardPlus} />
        <article className="data-panel patient-panel-state"><p className="error">{prescriptions.error}</p></article>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Patient" title="My Prescriptions" icon={ClipboardPlus} />
      <article className="data-panel">
        <header>
          <div><ClipboardPlus size={20} /><h2>Prescription History</h2></div>
          <span>{rows.length}</span>
        </header>
        <DataTable
          rows={rows}
          empty="No prescriptions yet. Prescriptions from your doctor will appear here after appointments."
          columns={[
            { key: "PrescriptionID", label: "ID" },
            { key: "DoctorName", label: "Doctor" },
            { key: "Diagnosis", label: "Diagnosis" },
            { key: "MedicationName", label: "Medication" },
            { key: "Dosage", label: "Dosage" },
            { key: "Frequency", label: "Frequency" },
            { key: "PrescriptionDate", label: "Date", render: (row) => row.PrescriptionDate ? new Date(row.PrescriptionDate).toLocaleDateString() : "-" }
          ]}
        />
      </article>
    </>
  );
}

export function MyTestOrders({ user }) {
  const patientId = Number(user.patientId);
  const orders = useApi("/tests/orders/opd");
  const rows = orders.data.filter((o) => Number(o.PatientID) === patientId);

  if (orders.loading) {
    return (
      <>
        <PageHeader eyebrow="Patient" title="My Test Orders" icon={FlaskConical} />
        <article className="data-panel patient-panel-state"><p className="muted">Loading your test orders...</p></article>
      </>
    );
  }

  if (orders.error) {
    return (
      <>
        <PageHeader eyebrow="Patient" title="My Test Orders" icon={FlaskConical} />
        <article className="data-panel patient-panel-state"><p className="error">{orders.error}</p></article>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Patient" title="My Test Orders" icon={FlaskConical} />
      <article className="data-panel">
        <header>
          <div><FlaskConical size={20} /><h2>Laboratory Requests</h2></div>
          <span>{rows.length}</span>
        </header>
        <DataTable
          rows={rows}
          empty="No test orders yet. Lab orders from your doctor will appear here."
          columns={[
            { key: "TestOrderID", label: "ID" },
            { key: "TestName", label: "Test" },
            { key: "Status", label: "Status", render: (row) => <span className={`patient-status ${String(row.Status || "").toLowerCase()}`}>{row.Status || "Unknown"}</span> },
            { key: "Results", label: "Results", render: (row) => row.Results || "Pending" },
            { key: "OrderDate", label: "Ordered On", render: (row) => row.OrderDate ? new Date(row.OrderDate).toLocaleDateString() : "-" }
          ]}
        />
      </article>
    </>
  );
}

export function MyAdmissions({ user }) {
  const patientId = Number(user.patientId);
  const admissions = useApi("/ipd/admissions");
  const rows = admissions.data.filter((a) => Number(a.PatientID) === patientId);

  if (admissions.loading) {
    return (
      <>
        <PageHeader eyebrow="Patient" title="My Admissions" icon={BedDouble} />
        <article className="data-panel patient-panel-state"><p className="muted">Loading your admissions...</p></article>
      </>
    );
  }

  if (admissions.error) {
    return (
      <>
        <PageHeader eyebrow="Patient" title="My Admissions" icon={BedDouble} />
        <article className="data-panel patient-panel-state"><p className="error">{admissions.error}</p></article>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Patient" title="My Admissions" icon={BedDouble} />
      <article className="data-panel">
        <header>
          <div><BedDouble size={20} /><h2>Admission History</h2></div>
          <span>{rows.length}</span>
        </header>
        <DataTable
          rows={rows}
          empty="No admissions found for your account."
          columns={[
            { key: "AdmissionID", label: "ID" },
            { key: "AdmissionType", label: "Type" },
            { key: "WardName", label: "Ward" },
            { key: "BedNumber", label: "Bed" },
            { key: "AttendingDoctorName", label: "Doctor" },
            { key: "Status", label: "Status", render: (row) => <span className={`patient-status ${String(row.Status || "").toLowerCase()}`}>{row.Status || "Unknown"}</span> },
            { key: "AdmissionDate", label: "Admitted On", render: (row) => row.AdmissionDate ? new Date(row.AdmissionDate).toLocaleDateString() : "-" }
          ]}
        />
      </article>
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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    // Minimal DB interaction path: reuse IPD diagnosis update as progress update for demo
    const selected = admissions.data.find((a) => String(a.AdmissionID) === String(form.admissionId));
    if (!selected) {
      setError("Select a valid admission.");
      return;
    }
    try {
      await api.put(`/ipd/admissions/${form.admissionId}`, {
        patientId: selected.PatientID,
        attendingDoctorId: selected.AttendingDoctorID,
        bedId: selected.BedID,
        wardId: selected.WardID,
        admissionType: selected.AdmissionType,
        status: selected.Status,
        clinicalDiagnosis: `${selected.ClinicalDiagnosis || ""}\n[Progress] ${form.vitalSigns} ${form.progressNotes}`.trim()
      });
      setMessage("Vitals/progress entry appended to clinical diagnosis.");
      setForm({ admissionId: "", vitalSigns: "", progressNotes: "" });
      admissions.reload();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save progress note.");
    }
  };
  const mine = admissions.data.filter((a) => user.role === "Nurse" || !user.doctorId || a.AttendingDoctorID === user.doctorId);
  return (
    <>
      <PageHeader eyebrow={user.role} title="Add Vitals / Progress Notes" icon={ClipboardPlus} />
      <article className="data-panel form-panel"><form onSubmit={submit}>
        <p className="muted">Temporary workflow: this appends entries to the admission clinical diagnosis field until a dedicated nurse notes endpoint is available.</p>
        <Field label="Admission"><SelectInput value={form.admissionId} onChange={(v) => setForm((c) => ({ ...c, admissionId: v }))} options={mine.map((a) => ({ value: a.AdmissionID, label: `#${a.AdmissionID} ${a.PatientName}` }))} required /></Field>
        <Field label="Vitals"><TextInput value={form.vitalSigns} onChange={(v) => setForm((c) => ({ ...c, vitalSigns: v }))} /></Field>
        <Field label="Progress note"><TextInput value={form.progressNotes} onChange={(v) => setForm((c) => ({ ...c, progressNotes: v }))} /></Field>
        <button type="submit"><Save size={18} />Save note</button>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </form></article>
    </>
  );
}

export function ViewReviewsPage({ user }) {
  const reviews = useApi("/reviews");
  const rows = reviews.data.filter((review) => !user?.doctorId || review.DoctorID === user.doctorId);
  const average = rows.length ? (rows.reduce((sum, row) => sum + Number(row.Rating || 0), 0) / rows.length).toFixed(1) : "0.0";
  return (
    <>
      <PageHeader eyebrow="Doctor" title="View Reviews" icon={Star} />
      <StatGrid stats={[{ label: "Reviews", value: rows.length }, { label: "Average Rating", value: average }, { label: "5-Star", value: rows.filter((item) => Number(item.Rating) === 5).length }]} />
      <DataTable rows={rows} columns={[{ key: "ReviewID", label: "ID" }, { key: "PatientName", label: "Patient" }, { key: "Rating", label: "Rating" }, { key: "Comments", label: "Comments" }]} />
    </>
  );
}

export function ReceptionDashboard() {
  const patients = useApi("/patients");
  const appointments = useApi("/opd/appointments");
  const admissions = useApi("/ipd/admissions");
  const beds = useApi("/departments/beds");
  const opdPayments = useApi("/billing/opd-payments", []);
  const availableBeds = beds.data.filter((bed) => bed.Status === "Available").length;
  const todayAppointments = appointments.data.filter((item) => new Date(item.AppointmentDate).toDateString() === new Date().toDateString()).length;
  const opdRevenue = opdPayments.data.reduce((sum, item) => sum + Number(item.PaidAmount || 0), 0);
  return (
    <>
      <PageHeader eyebrow="Receptionist" title="Reception Dashboard" icon={Users} />
      <StatGrid stats={[{ label: "Patients", value: patients.data.length }, { label: "Appointments", value: appointments.data.length }, { label: "Today OPD", value: todayAppointments }, { label: "IPD Active", value: admissions.data.filter((a) => a.Status === "Admitted").length }, { label: "Available Beds", value: availableBeds }, { label: "OPD Revenue", value: `Rs ${opdRevenue.toLocaleString()}` }]} />
      <section className="panel-grid">
        <article className="data-panel">
          <header><div><CalendarDays size={20} /><h2>Upcoming OPD</h2></div><span>{appointments.data.length}</span></header>
          <DataTable rows={appointments.data.slice(0, 8)} columns={[{ key: "AppointmentID", label: "ID" }, { key: "PatientName", label: "Patient" }, { key: "DoctorName", label: "Doctor" }, { key: "AppointmentDate", label: "Time", render: (row) => row.AppointmentDate ? new Date(row.AppointmentDate).toLocaleString() : "N/A" }, { key: "Status", label: "Status" }]} />
        </article>
        <article className="data-panel">
          <header><div><BedDouble size={20} /><h2>Recent Admissions</h2></div><span>{admissions.data.length}</span></header>
          <DataTable rows={admissions.data.slice(0, 8)} columns={[{ key: "AdmissionID", label: "ID" }, { key: "PatientName", label: "Patient" }, { key: "WardName", label: "Ward" }, { key: "BedNumber", label: "Bed" }, { key: "Status", label: "Status" }]} />
        </article>
      </section>
    </>
  );
}

export function AdmitPatientPage() {
  const patients = useApi("/patients");
  const doctors = useApi("/doctors");
  const wards = useApi("/departments/wards");
  const beds = useApi("/departments/beds");
  const [form, setForm] = useState({ patientId: "", doctorId: "", wardId: "", bedId: "", admissionType: "Emergency" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selectedWard = wards.data.find((ward) => String(ward.WardID) === String(form.wardId));
  const doctorOptions = doctors.data.filter((doctor) => {
    if (!selectedWard) return true;
    if (!doctor.Departments) return true;
    return String(doctor.Departments).toLowerCase().includes(String(selectedWard.DepartmentName || "").toLowerCase());
  });
  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      await api.post("/ipd/admissions", { patientId: Number(form.patientId), attendingDoctorId: Number(form.doctorId), wardId: Number(form.wardId), bedId: Number(form.bedId), admissionType: form.admissionType, clinicalDiagnosis: "Reception admission" });
      setMessage("Patient admitted.");
      setForm({ patientId: "", doctorId: "", wardId: "", bedId: "", admissionType: "Emergency" });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to admit patient.");
    }
  };
  return (
    <>
      <PageHeader eyebrow="Receptionist" title="Admit Patient" icon={BedDouble} />
      <article className="data-panel form-panel"><form onSubmit={submit}>
        <Field label="Patient"><SelectInput value={form.patientId} onChange={(v) => setForm((c) => ({ ...c, patientId: v }))} options={patients.data.map((p) => ({ value: p.PatientID, label: p.FullName }))} required /></Field>
        <Field label="Ward"><SelectInput value={form.wardId} onChange={(v) => setForm((c) => ({ ...c, wardId: v, doctorId: "", bedId: "" }))} options={wards.data.map((w) => ({ value: w.WardID, label: w.WardName }))} required /></Field>
        <Field label="Doctor"><SelectInput value={form.doctorId} onChange={(v) => setForm((c) => ({ ...c, doctorId: v }))} options={doctorOptions.map((d) => ({ value: d.DoctorID, label: `${d.FullName}${d.Departments ? ` (${d.Departments})` : ""}` }))} required /></Field>
        <Field label="Bed"><SelectInput value={form.bedId} onChange={(v) => setForm((c) => ({ ...c, bedId: v }))} options={beds.data.filter((b) => b.Status === "Available" && (!form.wardId || String(b.WardID) === String(form.wardId))).map((b) => ({ value: b.BedID, label: `${b.WardName} ${b.BedNumber}` }))} required /></Field>
        <Field label="Admission type"><SelectInput value={form.admissionType} onChange={(v) => setForm((c) => ({ ...c, admissionType: v }))} options={["Emergency", "Scheduled", "Observation"].map((item) => ({ value: item, label: item }))} required /></Field>
        <p className="muted">Attending doctor must be active and aligned with ward department assignment.</p>
        <button type="submit"><Save size={18} />Admit patient</button>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </form></article>
    </>
  );
}

export function AssignBedPage() {
  const admissions = useApi("/ipd/admissions");
  const beds = useApi("/departments/beds");
  const [form, setForm] = useState({ admissionId: "", bedId: "", status: "Admitted" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const selected = admissions.data.find((item) => String(item.AdmissionID) === String(form.admissionId));
    const selectedBed = beds.data.find((item) => String(item.BedID) === String(form.bedId));
    if (!selected || !selectedBed) {
      setError("Select a valid admission and bed.");
      return;
    }
    try {
      await api.put(`/ipd/admissions/${form.admissionId}`, {
        patientId: selected.PatientID,
        attendingDoctorId: selected.AttendingDoctorID,
        bedId: selectedBed.BedID,
        wardId: selectedBed.WardID || selected.WardID,
        admissionType: selected.AdmissionType,
        status: form.status,
        clinicalDiagnosis: selected.ClinicalDiagnosis || ""
      });
      await api.put(`/departments/beds/${selectedBed.BedID}/status`, { status: "Occupied" });
      setMessage("Bed assigned and updated to Occupied.");
      setForm({ admissionId: "", bedId: "", status: "Admitted" });
      admissions.reload();
      beds.reload();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to assign bed.");
    }
  };

  const activeAdmissions = admissions.data.filter((item) => item.Status !== "Discharged");
  const availableBeds = beds.data.filter((item) => item.Status === "Available");

  return (
    <>
      <PageHeader eyebrow="Receptionist" title="Assign Bed" icon={BedDouble} />
      <section className="workspace-grid">
        <article className="data-panel">
          <form onSubmit={submit}>
            <Field label="Admission"><SelectInput value={form.admissionId} onChange={(v) => setForm((c) => ({ ...c, admissionId: v }))} options={activeAdmissions.map((item) => ({ value: item.AdmissionID, label: `#${item.AdmissionID} ${item.PatientName}` }))} required /></Field>
            <Field label="Bed"><SelectInput value={form.bedId} onChange={(v) => setForm((c) => ({ ...c, bedId: v }))} options={availableBeds.map((item) => ({ value: item.BedID, label: `${item.WardName} - ${item.BedNumber}` }))} required /></Field>
            <Field label="Admission status"><SelectInput value={form.status} onChange={(v) => setForm((c) => ({ ...c, status: v }))} options={["Admitted", "Transferred"].map((item) => ({ value: item, label: item }))} required /></Field>
            <button type="submit"><Save size={18} />Assign bed</button>
            {message && <p className="success">{message}</p>}
            {error && <p className="error">{error}</p>}
          </form>
        </article>
        <article className="data-panel wide-panel">
          <header><div><BedDouble size={20} /><h2>Available Beds</h2></div><span>{availableBeds.length}</span></header>
          <DataTable rows={availableBeds} columns={[{ key: "BedID", label: "ID" }, { key: "WardName", label: "Ward" }, { key: "BedNumber", label: "Bed" }, { key: "BedType", label: "Type" }, { key: "Status", label: "Status" }]} />
        </article>
      </section>
    </>
  );
}

export function IpdPatientDetailsPage({ user }) {
  const admissions = useApi("/ipd/admissions");
  const rows = admissions.data.filter((a) => user.role === "Nurse" || !user.doctorId || a.AttendingDoctorID === user.doctorId);
  const [selectedId, setSelectedId] = useState("");
  const selected = rows.find((item) => String(item.AdmissionID) === String(selectedId)) || rows[0];
  useEffect(() => {
    if (!selectedId && rows.length) {
      setSelectedId(String(rows[0].AdmissionID));
    }
  }, [rows, selectedId]);
  return (
    <>
      <PageHeader eyebrow={user.role} title="IPD Patient Details" icon={BedDouble} />
      <section className="workspace-grid">
        <article className="data-panel">
          <header><div><BedDouble size={20} /><h2>IPD Admissions</h2></div><span>{rows.length}</span></header>
          <Field label="Select patient admission">
            <SelectInput value={selected?.AdmissionID || ""} onChange={(value) => setSelectedId(value)} options={rows.map((item) => ({ value: item.AdmissionID, label: `#${item.AdmissionID} ${item.PatientName}` }))} />
          </Field>
          <DataTable rows={rows} columns={[{ key: "AdmissionID", label: "Admission" }, { key: "PatientName", label: "Patient" }, { key: "WardName", label: "Ward" }, { key: "BedNumber", label: "Bed" }, { key: "Status", label: "Status" }]} />
        </article>
        <article className="data-panel wide-panel">
          <header><div><Activity size={20} /><h2>Admission Detail</h2></div></header>
          {!selected ? (
            <p className="muted">No admission record available.</p>
          ) : (
            <dl className="profile-list compact-list">
              <div><dt>Admission ID</dt><dd>#{selected.AdmissionID}</dd></div>
              <div><dt>Patient</dt><dd>{selected.PatientName || "N/A"}</dd></div>
              <div><dt>Attending doctor</dt><dd>{selected.DoctorName || "N/A"}</dd></div>
              <div><dt>Ward / Bed</dt><dd>{`${selected.WardName || "N/A"} / ${selected.BedNumber || "N/A"}`}</dd></div>
              <div><dt>Type</dt><dd>{selected.AdmissionType || "N/A"}</dd></div>
              <div><dt>Status</dt><dd>{selected.Status || "N/A"}</dd></div>
              <div><dt>Diagnosis</dt><dd>{selected.ClinicalDiagnosis || "No diagnosis recorded."}</dd></div>
            </dl>
          )}
        </article>
      </section>
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

export function AssignedWardPage({ user }) {
  const admissions = useApi("/ipd/admissions");
  const roster = useApi("/departments/duty-roster", []);
  const myShifts = roster.data.filter((item) => !user?.userId || String(item.UserID) === String(user.userId));
  const wardNames = [...new Set(myShifts.map((item) => item.DepartmentName).filter(Boolean))];
  const rows = wardNames.length
    ? admissions.data.filter((item) => wardNames.includes(item.WardName))
    : admissions.data;
  return (
    <>
      <PageHeader eyebrow="Nurse" title="Assigned Ward View" icon={BedDouble} />
      <p className="muted">Showing patients from wards mapped to your duty roster; if roster-ward mapping is unavailable, all active admissions are shown.</p>
      <DataTable rows={rows} columns={[{ key: "AdmissionID", label: "Admission" }, { key: "WardName", label: "Ward" }, { key: "BedNumber", label: "Bed" }, { key: "PatientName", label: "Patient" }, { key: "Status", label: "Status" }]} />
    </>
  );
}

export function BedStatusPage() {
  const beds = useApi("/departments/beds");
  const [form, setForm] = useState({ bedId: "", status: "Available" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      await api.put(`/departments/beds/${form.bedId}/status`, { status: form.status });
      setMessage("Bed status updated.");
      beds.reload();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update bed status.");
    }
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
            {error && <p className="error">{error}</p>}
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
      <p className="muted">Read-only roster view for nurses. Shift changes are managed by Admin in Duty Roster Management.</p>
      <DataTable rows={rows} columns={[{ key: "RosterID", label: "ID" }, { key: "DepartmentName", label: "Department" }, { key: "ShiftDate", label: "Date" }, { key: "ShiftType", label: "Shift" }, { key: "Status", label: "Status" }]} />
    </>
  );
}

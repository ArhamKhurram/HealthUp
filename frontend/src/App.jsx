import React, { useMemo, useState } from "react";
import {
  Activity,
  BedDouble,
  CalendarDays,
  ClipboardPlus,
  CreditCard,
  FlaskConical,
  HeartPulse,
  LogOut,
  Pill,
  ShieldAlert,
  Stethoscope,
  UserCog,
  Users
} from "lucide-react";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import {
  AddPrescription,
  AdminDashboard,
  BookAppointment,
  DoctorAppointments,
  ManageDoctors,
  ManagePatients,
  MyAppointments,
  NurseDashboard,
  PatientDashboard,
  PaymentsPage,
  PlaceholderPage,
  ProfilePage,
  SubmitReview
} from "./pages/RolePages";

const pageCatalog = {
  profile: { label: "Profile", icon: Users, roles: ["Admin", "Patient", "Doctor", "Nurse"] },
  adminDashboard: { label: "Admin Dashboard", icon: Activity, roles: ["Admin"] },
  manageUsers: { label: "Manage Users", icon: UserCog, roles: ["Admin"], placeholder: true },
  managePatients: { label: "Manage Patients", icon: Users, roles: ["Admin"] },
  manageDoctors: { label: "Manage Doctors", icon: Stethoscope, roles: ["Admin"] },
  manageNurses: { label: "Manage Nurses", icon: Users, roles: ["Admin"], placeholder: true },
  departments: { label: "Departments", icon: Activity, roles: ["Admin"], placeholder: true },
  wardsBeds: { label: "Wards & Beds", icon: BedDouble, roles: ["Admin"], placeholder: true },
  opdRooms: { label: "OPD Rooms", icon: CalendarDays, roles: ["Admin"], placeholder: true },
  medications: { label: "Medications", icon: Pill, roles: ["Admin"], placeholder: true },
  inventory: { label: "Inventory", icon: Pill, roles: ["Admin"], placeholder: true },
  medicalTests: { label: "Medical Tests", icon: FlaskConical, roles: ["Admin"], placeholder: true },
  dutyRoster: { label: "Duty Roster", icon: CalendarDays, roles: ["Admin", "Nurse"], placeholder: true },
  equipment: { label: "Equipment", icon: Activity, roles: ["Admin"], placeholder: true },
  reports: { label: "Reports", icon: Activity, roles: ["Admin"], placeholder: true },
  patientDashboard: { label: "Patient Dashboard", icon: Activity, roles: ["Patient"] },
  bookAppointment: { label: "Book Appointment", icon: CalendarDays, roles: ["Admin", "Patient"] },
  myAppointments: { label: "My Appointments", icon: CalendarDays, roles: ["Patient"] },
  myPrescriptions: { label: "My Prescriptions", icon: ClipboardPlus, roles: ["Patient"], placeholder: true },
  myTestOrders: { label: "My Test Orders", icon: FlaskConical, roles: ["Patient"], placeholder: true },
  payments: { label: "Payments", icon: CreditCard, roles: ["Admin", "Patient"] },
  myAdmissions: { label: "My Admissions", icon: BedDouble, roles: ["Patient"], placeholder: true },
  submitReview: { label: "Submit Review", icon: Activity, roles: ["Patient"] },
  doctorDashboard: { label: "Doctor Dashboard", icon: Activity, roles: ["Doctor"], placeholder: true },
  doctorAppointments: { label: "OPD Appointments", icon: CalendarDays, roles: ["Doctor"] },
  appointmentDetails: { label: "Appointment Details", icon: CalendarDays, roles: ["Doctor"], placeholder: true },
  addPrescription: { label: "Add Prescription", icon: ClipboardPlus, roles: ["Doctor"] },
  orderOpdTests: { label: "Order OPD Tests", icon: FlaskConical, roles: ["Doctor"], placeholder: true },
  ipdPatients: { label: "IPD Patients", icon: BedDouble, roles: ["Doctor", "Nurse"], placeholder: true },
  ipdPatientDetails: { label: "IPD Patient Details", icon: BedDouble, roles: ["Doctor"], placeholder: true },
  progressNotes: { label: "Progress Notes", icon: ClipboardPlus, roles: ["Doctor", "Nurse"], placeholder: true },
  ipdPrescription: { label: "IPD Prescription", icon: ClipboardPlus, roles: ["Doctor"], placeholder: true },
  orderIpdTests: { label: "Order IPD Tests", icon: FlaskConical, roles: ["Doctor"], placeholder: true },
  surgeries: { label: "Surgery Bookings", icon: Activity, roles: ["Doctor"], placeholder: true },
  viewReviews: { label: "View Reviews", icon: Activity, roles: ["Doctor"], placeholder: true },
  nurseDashboard: { label: "Nurse Dashboard", icon: Activity, roles: ["Nurse"] },
  assignedWard: { label: "Assigned Ward", icon: BedDouble, roles: ["Nurse"], placeholder: true },
  bedStatus: { label: "Update Bed Status", icon: BedDouble, roles: ["Nurse"], placeholder: true }
};

const roleDefaults = {
  Admin: "adminDashboard",
  Patient: "patientDashboard",
  Doctor: "doctorAppointments",
  Nurse: "nurseDashboard"
};

function App() {
  const { user, logout } = useAuth();
  const [activePage, setActivePage] = useState("");

  const allowedPages = useMemo(() => {
    if (!user) return [];
    return Object.entries(pageCatalog)
      .filter(([, page]) => page.roles.includes(user.role))
      .map(([key, page]) => ({ key, ...page }));
  }, [user]);

  if (!user) {
    return <LoginPage />;
  }

  const currentPage = activePage || roleDefaults[user.role] || "profile";
  const page = pageCatalog[currentPage];
  const canView = page?.roles.includes(user.role);

  const renderPage = () => {
    if (!page) {
      return <NotFound />;
    }
    if (!canView) {
      return <Unauthorized />;
    }
    if (page.placeholder) {
      return <PlaceholderPage title={page.label} role={user.role} />;
    }

    switch (currentPage) {
      case "adminDashboard":
        return <AdminDashboard />;
      case "managePatients":
        return <ManagePatients />;
      case "manageDoctors":
        return <ManageDoctors />;
      case "bookAppointment":
        return <BookAppointment user={user} />;
      case "doctorAppointments":
        return <DoctorAppointments user={user} />;
      case "addPrescription":
        return <AddPrescription user={user} />;
      case "patientDashboard":
        return <PatientDashboard user={user} />;
      case "myAppointments":
        return <MyAppointments user={user} />;
      case "payments":
        return <PaymentsPage user={user} />;
      case "submitReview":
        return <SubmitReview user={user} />;
      case "nurseDashboard":
        return <NurseDashboard />;
      case "profile":
        return <ProfilePage user={user} />;
      default:
        return <NotFound />;
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <HeartPulse size={28} />
          <div>
            <strong>HealthUp</strong>
            <span>{user.role} Portal</span>
          </div>
        </div>
        <nav>
          {allowedPages.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={currentPage === item.key ? "active" : ""}
                key={item.key}
                onClick={() => setActivePage(item.key)}
                type="button"
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p>Welcome back</p>
            <h1>{user.fullName}</h1>
          </div>
          <button className="icon-button" onClick={logout} title="Log out">
            <LogOut size={18} />
            Log out
          </button>
        </header>
        {renderPage()}
      </main>
    </div>
  );
}

function Unauthorized() {
  return (
    <article className="data-panel form-panel">
      <ShieldAlert size={28} />
      <h1>Unauthorized</h1>
      <p className="muted">This account does not have access to that page.</p>
    </article>
  );
}

function NotFound() {
  return (
    <article className="data-panel form-panel">
      <ShieldAlert size={28} />
      <h1>Not Found</h1>
      <p className="muted">That page does not exist in HealthUp.</p>
    </article>
  );
}

export default App;

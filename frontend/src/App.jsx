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
  UserCheck,
  UserCog,
  Users
} from "lucide-react";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import {
  AddPrescription,
  AdmitPatientPage,
  AdminDashboard,
  AppointmentDetails,
  AssignBedPage,
  BookAppointment,
  DepartmentsManagement,
  DoctorDashboard,
  DoctorAppointments,
  DutyRosterManagement,
  EquipmentManagement,
  IpdPatients,
  ManageDoctors,
  ManagePatients,
  MyAdmissions,
  MyAppointments,
  MyPrescriptions,
  MyTestOrders,
  NurseDutyRosterPage,
  NurseDashboard,
  OpdRoomsManagement,
  OrderIpdTestsPage,
  OrderOpdTests,
  PatientDashboard,
  PaymentsPage,
  PlaceholderPage,
  ProfilePage,
  ProgressNotesPage,
  ReceptionDashboard,
  SubmitReview,
  IpdPatientDetailsPage,
  AddIpdPrescriptionPage,
  AssignedWardPage,
  BedStatusPage,
  ViewReviewsPage,
  WardsBedsManagement
} from "./pages/RolePages";

const pageCatalog = {
  profile: { label: "Profile", icon: Users, roles: ["Admin", "Patient", "Doctor", "Nurse", "Receptionist"] },
  adminDashboard: { label: "Admin Dashboard", icon: Activity, roles: ["Admin"] },
  manageUsers: { label: "Manage Users", icon: UserCog, roles: ["Admin"], placeholder: true },
  managePatients: { label: "Manage Patients", icon: Users, roles: ["Admin"] },
  manageDoctors: { label: "Manage Doctors", icon: Stethoscope, roles: ["Admin"] },
  manageNurses: { label: "Manage Nurses", icon: Users, roles: ["Admin"] },
  departments: { label: "Departments", icon: Activity, roles: ["Admin"] },
  wardsBeds: { label: "Wards & Beds", icon: BedDouble, roles: ["Admin"] },
  opdRooms: { label: "OPD Rooms", icon: CalendarDays, roles: ["Admin"] },
  medications: { label: "Medications", icon: Pill, roles: ["Admin"], placeholder: true },
  inventory: { label: "Inventory", icon: Pill, roles: ["Admin"], placeholder: true },
  medicalTests: { label: "Medical Tests", icon: FlaskConical, roles: ["Admin"], placeholder: true },
  dutyRoster: { label: "Duty Roster", icon: CalendarDays, roles: ["Admin", "Nurse"] },
  equipment: { label: "Equipment", icon: Activity, roles: ["Admin"] },
  reports: { label: "Reports", icon: Activity, roles: ["Admin"], placeholder: true },
  patientDashboard: { label: "Patient Dashboard", icon: Activity, roles: ["Patient"] },
  bookAppointment: { label: "Book Appointment", icon: CalendarDays, roles: ["Admin", "Patient"] },
  myAppointments: { label: "My Appointments", icon: CalendarDays, roles: ["Patient"] },
  myPrescriptions: { label: "My Prescriptions", icon: ClipboardPlus, roles: ["Patient"] },
  myTestOrders: { label: "My Test Orders", icon: FlaskConical, roles: ["Patient"] },
  payments: { label: "Payments", icon: CreditCard, roles: ["Admin", "Patient"] },
  myAdmissions: { label: "My Admissions", icon: BedDouble, roles: ["Patient"] },
  submitReview: { label: "Submit Review", icon: Activity, roles: ["Patient"] },
  doctorDashboard: { label: "Doctor Dashboard", icon: Activity, roles: ["Doctor"] },
  doctorAppointments: { label: "OPD Appointments", icon: CalendarDays, roles: ["Doctor"] },
  appointmentDetails: { label: "Appointment Details", icon: CalendarDays, roles: ["Doctor"] },
  addPrescription: { label: "Add Prescription", icon: ClipboardPlus, roles: ["Doctor"] },
  orderOpdTests: { label: "Order OPD Tests", icon: FlaskConical, roles: ["Doctor"] },
  ipdPatients: { label: "IPD Patients", icon: BedDouble, roles: ["Doctor", "Nurse"] },
  ipdPatientDetails: { label: "IPD Patient Details", icon: BedDouble, roles: ["Doctor"] },
  progressNotes: { label: "Progress Notes", icon: ClipboardPlus, roles: ["Doctor", "Nurse"] },
  ipdPrescription: { label: "IPD Prescription", icon: ClipboardPlus, roles: ["Doctor"] },
  orderIpdTests: { label: "Order IPD Tests", icon: FlaskConical, roles: ["Doctor"] },
  surgeries: { label: "Surgery Bookings", icon: Activity, roles: ["Doctor"], placeholder: true },
  viewReviews: { label: "View Reviews", icon: Activity, roles: ["Doctor"] },
  nurseDashboard: { label: "Nurse Dashboard", icon: Activity, roles: ["Nurse"] },
  assignedWard: { label: "Assigned Ward", icon: BedDouble, roles: ["Nurse"] },
  bedStatus: { label: "Update Bed Status", icon: BedDouble, roles: ["Nurse"] }
  ,
  receptionDashboard: { label: "Reception Dashboard", icon: UserCheck, roles: ["Receptionist"] },
  registerPatientReception: { label: "Register Patient", icon: Users, roles: ["Receptionist", "Admin"] },
  receptionBookAppointment: { label: "Book OPD Appointment", icon: CalendarDays, roles: ["Receptionist", "Admin"] },
  receptionAdmitPatient: { label: "Admit Patient", icon: BedDouble, roles: ["Receptionist"] },
  receptionAssignBed: { label: "Assign Bed", icon: BedDouble, roles: ["Receptionist"] },
  receptionRecordPayment: { label: "Record Payment", icon: CreditCard, roles: ["Receptionist", "Admin"] }
};

const roleDefaults = {
  Admin: "adminDashboard",
  Patient: "patientDashboard",
  Doctor: "doctorAppointments",
  Nurse: "nurseDashboard",
  Receptionist: "receptionDashboard"
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
      case "registerPatientReception":
        return <ManagePatients />;
      case "manageDoctors":
        return <ManageDoctors />;
      case "manageNurses":
        return <DutyRosterManagement />;
      case "departments":
        return <DepartmentsManagement />;
      case "wardsBeds":
        return <WardsBedsManagement />;
      case "opdRooms":
        return <OpdRoomsManagement />;
      case "equipment":
        return <EquipmentManagement />;
      case "bookAppointment":
      case "receptionBookAppointment":
        return <BookAppointment user={user} />;
      case "doctorAppointments":
        return <DoctorAppointments user={user} />;
      case "doctorDashboard":
        return <DoctorDashboard user={user} />;
      case "appointmentDetails":
        return <AppointmentDetails user={user} />;
      case "addPrescription":
        return <AddPrescription user={user} />;
      case "orderOpdTests":
        return <OrderOpdTests user={user} />;
      case "ipdPatients":
        return <IpdPatients user={user} />;
      case "ipdPatientDetails":
        return <IpdPatientDetailsPage user={user} />;
      case "progressNotes":
        return <ProgressNotesPage user={user} />;
      case "ipdPrescription":
        return <AddIpdPrescriptionPage user={user} />;
      case "orderIpdTests":
        return <OrderIpdTestsPage user={user} />;
      case "viewReviews":
        return <ViewReviewsPage />;
      case "patientDashboard":
        return <PatientDashboard user={user} />;
      case "myAppointments":
        return <MyAppointments user={user} />;
      case "myPrescriptions":
        return <MyPrescriptions user={user} />;
      case "myTestOrders":
        return <MyTestOrders user={user} />;
      case "myAdmissions":
        return <MyAdmissions user={user} />;
      case "payments":
      case "receptionRecordPayment":
        return <PaymentsPage user={user} />;
      case "submitReview":
        return <SubmitReview user={user} />;
      case "nurseDashboard":
        return <NurseDashboard />;
      case "assignedWard":
        return <AssignedWardPage />;
      case "bedStatus":
        return <BedStatusPage />;
      case "dutyRoster":
        return user.role === "Nurse" ? <NurseDutyRosterPage user={user} /> : <DutyRosterManagement />;
      case "receptionDashboard":
        return <ReceptionDashboard />;
      case "receptionAdmitPatient":
        return <AdmitPatientPage />;
      case "receptionAssignBed":
        return <AssignBedPage />;
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

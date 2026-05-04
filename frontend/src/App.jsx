import React, { useEffect, useMemo, useState } from "react";
import { HeartPulse, LogOut, ShieldAlert } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { roleDefaultRouteKey, roleRoutes } from "./config/routes";
import LoginPage from "./pages/LoginPage";
import {
  AddIpdPrescriptionPage,
  AddPrescription,
  AdmitPatientPage,
  AdminDashboard,
  AppointmentDetails,
  AssignedWardPage,
  AssignBedPage,
  BedStatusPage,
  BookAppointment,
  DepartmentsManagement,
  DoctorDashboard,
  DoctorAppointments,
  DutyRosterManagement,
  EquipmentManagement,
  IpdPatientDetailsPage,
  IpdPatients,
  ManageUsersPage,
  MyAdmissions,
  MyAppointments,
  MyPrescriptions,
  MyTestOrders,
  NurseDashboard,
  NurseDutyRosterPage,
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
  ViewReviewsPage,
  WardsBedsManagement
} from "./pages/RolePages";

function App() {
  const auth = useAuth() || {};
  const user = auth.user || null;
  const logout = auth.logout || (() => {});
  const [activePage, setActivePage] = useState("");

  const allowedPages = useMemo(() => {
    if (!user) return [];
    return Object.entries(roleRoutes)
      .filter(([, route]) => route.roles.includes(user.role))
      .map(([key, route]) => ({ key, ...route }));
  }, [user]);

  useEffect(() => {
    if (!user || !activePage) return;
    const stillAllowed = allowedPages.some((route) => route.key === activePage);
    if (!stillAllowed) {
      setActivePage("");
    }
  }, [activePage, allowedPages, user]);

  if (!user) {
    return <LoginPage />;
  }

  const defaultRouteKey = roleDefaultRouteKey[user.role];
  const roleFallbackRouteKey = allowedPages[0]?.key || "profile";
  const requestedRouteKey = activePage || defaultRouteKey || roleFallbackRouteKey;
  const currentRouteKey = roleRoutes[requestedRouteKey] ? requestedRouteKey : roleFallbackRouteKey;
  const currentRoute = roleRoutes[currentRouteKey];
  const canView = currentRoute?.roles.includes(user.role);

  const renderPage = () => {
    if (!currentRoute) {
      return <NotFound />;
    }
    if (!canView) {
      return <Unauthorized />;
    }
    if (currentRoute.placeholder) {
      return <PlaceholderPage title={currentRoute.label} role={user.role} />;
    }

    switch (currentRoute.view) {
      case "adminDashboard":
        return <AdminDashboard />;
      case "manageUsers":
        return <ManageUsersPage />;
      case "departments":
        return <DepartmentsManagement />;
      case "wardsBeds":
        return <WardsBedsManagement />;
      case "opdRooms":
        return <OpdRoomsManagement />;
      case "equipment":
        return <EquipmentManagement />;
      case "bookAppointment":
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
            const Icon = item.icon || HeartPulse;
            return (
              <button
                className={currentRouteKey === item.key ? "active" : ""}
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

import { Activity, BedDouble, CalendarDays, ClipboardPlus, CreditCard, UserCheck, UserCog, Users } from "lucide-react";

export const roleRoutes = {
  profile: { label: "Profile", icon: Users, roles: ["Admin", "Patient", "Doctor", "Nurse", "Receptionist"], view: "profile" },
  adminDashboard: { label: "Admin Dashboard", icon: Activity, roles: ["Admin"], view: "adminDashboard" },
  manageUsers: { label: "Manage Users", icon: UserCog, roles: ["Admin"], view: "manageUsers" },
  departments: { label: "Departments", icon: Activity, roles: ["Admin"], view: "departments" },
  patientDashboard: { label: "Patient Dashboard", icon: Activity, roles: ["Patient"], view: "patientDashboard" },
  bookAppointment: { label: "Book Appointment", icon: CalendarDays, roles: ["Admin", "Patient", "Receptionist"], view: "bookAppointment" },
  myAppointments: { label: "My Appointments", icon: CalendarDays, roles: ["Patient"], view: "myAppointments" },
  myPrescriptions: { label: "My Prescriptions", icon: ClipboardPlus, roles: ["Patient"], view: "myPrescriptions" },
  payments: { label: "Payments", icon: CreditCard, roles: ["Patient"], view: "payments" },
  myAdmissions: { label: "My Admissions", icon: BedDouble, roles: ["Patient"], view: "myAdmissions" },
  submitReview: { label: "Submit Review", icon: Activity, roles: ["Patient"], view: "submitReview" },
  doctorDashboard: { label: "Doctor Dashboard", icon: Activity, roles: ["Doctor"], view: "doctorDashboard" },
  doctorAppointments: { label: "OPD Appointments", icon: CalendarDays, roles: ["Doctor"], view: "doctorAppointments" },
  appointmentDetails: { label: "Appointment Details", icon: CalendarDays, roles: ["Doctor"], view: "appointmentDetails" },
  addPrescription: { label: "Add Prescription", icon: ClipboardPlus, roles: ["Doctor"], view: "addPrescription" },
  ipdPatients: { label: "IPD Patients", icon: BedDouble, roles: ["Doctor", "Nurse"], view: "ipdPatients" },
  ipdPatientDetails: { label: "IPD Patient Details", icon: BedDouble, roles: ["Doctor"], view: "ipdPatientDetails" },
  progressNotes: { label: "Progress Notes", icon: ClipboardPlus, roles: ["Doctor", "Nurse"], view: "progressNotes" },
  ipdPrescription: { label: "IPD Prescription", icon: ClipboardPlus, roles: ["Doctor"], view: "ipdPrescription" },
  viewReviews: { label: "View Reviews", icon: Activity, roles: ["Doctor"], view: "viewReviews" },
  nurseDashboard: { label: "Nurse Dashboard", icon: Activity, roles: ["Nurse"], view: "nurseDashboard" },
  receptionDashboard: { label: "Reception Dashboard", icon: UserCheck, roles: ["Receptionist"], view: "receptionDashboard" },
  receptionAdmitPatient: { label: "Admit Patient", icon: BedDouble, roles: ["Receptionist"], view: "receptionAdmitPatient" }
};

export const roleDefaultRouteKey = {
  Admin: "adminDashboard",
  Patient: "patientDashboard",
  Doctor: "doctorAppointments",
  Nurse: "nurseDashboard",
  Receptionist: "receptionDashboard"
};

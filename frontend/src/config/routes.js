import { Activity, BedDouble, CalendarDays, ClipboardPlus, CreditCard, FlaskConical, Pill, Stethoscope, UserCheck, UserCog, Users } from "lucide-react";

export const roleRoutes = {
  profile: { label: "Profile", icon: Users, roles: ["Admin", "Patient", "Doctor", "Nurse", "Receptionist"], view: "profile" },
  adminDashboard: { label: "Admin Dashboard", icon: Activity, roles: ["Admin"], view: "adminDashboard" },
  manageUsers: { label: "Manage Users", icon: UserCog, roles: ["Admin"], view: "manageUsers" },
  departments: { label: "Departments", icon: Activity, roles: ["Admin"], view: "departments" },
  wardsBeds: { label: "Wards & Beds", icon: BedDouble, roles: ["Admin"], view: "wardsBeds" },
  opdRooms: { label: "OPD Rooms", icon: CalendarDays, roles: ["Admin"], view: "opdRooms" },
  medications: { label: "Medications", icon: Pill, roles: ["Admin"], view: "placeholder", placeholder: true },
  medicalTests: { label: "Medical Tests", icon: FlaskConical, roles: ["Admin"], view: "placeholder", placeholder: true },
  dutyRoster: { label: "Duty Roster", icon: CalendarDays, roles: ["Admin", "Nurse"], view: "dutyRoster" },
  equipment: { label: "Equipment", icon: Activity, roles: ["Admin"], view: "equipment" },
  reports: { label: "Reports", icon: Activity, roles: ["Admin"], view: "placeholder", placeholder: true },
  patientDashboard: { label: "Patient Dashboard", icon: Activity, roles: ["Patient"], view: "patientDashboard" },
  bookAppointment: { label: "Book Appointment", icon: CalendarDays, roles: ["Admin", "Patient", "Receptionist"], view: "bookAppointment" },
  myAppointments: { label: "My Appointments", icon: CalendarDays, roles: ["Patient"], view: "myAppointments" },
  myPrescriptions: { label: "My Prescriptions", icon: ClipboardPlus, roles: ["Patient"], view: "myPrescriptions" },
  myTestOrders: { label: "My Test Orders", icon: FlaskConical, roles: ["Patient"], view: "myTestOrders" },
  payments: { label: "Payments", icon: CreditCard, roles: ["Patient"], view: "payments" },
  myAdmissions: { label: "My Admissions", icon: BedDouble, roles: ["Patient"], view: "myAdmissions" },
  submitReview: { label: "Submit Review", icon: Activity, roles: ["Patient"], view: "submitReview" },
  doctorDashboard: { label: "Doctor Dashboard", icon: Activity, roles: ["Doctor"], view: "doctorDashboard" },
  doctorAppointments: { label: "OPD Appointments", icon: CalendarDays, roles: ["Doctor"], view: "doctorAppointments" },
  appointmentDetails: { label: "Appointment Details", icon: CalendarDays, roles: ["Doctor"], view: "appointmentDetails" },
  addPrescription: { label: "Add Prescription", icon: ClipboardPlus, roles: ["Doctor"], view: "addPrescription" },
  orderOpdTests: { label: "Order OPD Tests", icon: FlaskConical, roles: ["Doctor"], view: "orderOpdTests" },
  ipdPatients: { label: "IPD Patients", icon: BedDouble, roles: ["Doctor", "Nurse"], view: "ipdPatients" },
  ipdPatientDetails: { label: "IPD Patient Details", icon: BedDouble, roles: ["Doctor"], view: "ipdPatientDetails" },
  progressNotes: { label: "Progress Notes", icon: ClipboardPlus, roles: ["Doctor", "Nurse"], view: "progressNotes" },
  ipdPrescription: { label: "IPD Prescription", icon: ClipboardPlus, roles: ["Doctor"], view: "ipdPrescription" },
  orderIpdTests: { label: "Order IPD Tests", icon: FlaskConical, roles: ["Doctor"], view: "orderIpdTests" },
  surgeries: { label: "Surgery Bookings", icon: Activity, roles: ["Doctor"], view: "placeholder", placeholder: true },
  viewReviews: { label: "View Reviews", icon: Activity, roles: ["Doctor"], view: "viewReviews" },
  nurseDashboard: { label: "Nurse Dashboard", icon: Activity, roles: ["Nurse"], view: "nurseDashboard" },
  assignedWard: { label: "Assigned Ward", icon: BedDouble, roles: ["Nurse"], view: "assignedWard" },
  bedStatus: { label: "Update Bed Status", icon: BedDouble, roles: ["Nurse"], view: "bedStatus" },
  receptionDashboard: { label: "Reception Dashboard", icon: UserCheck, roles: ["Receptionist"], view: "receptionDashboard" },
  receptionAdmitPatient: { label: "Admit Patient", icon: BedDouble, roles: ["Receptionist"], view: "receptionAdmitPatient" },
  receptionAssignBed: { label: "Assign Bed", icon: BedDouble, roles: ["Receptionist"], view: "receptionAssignBed" }
};

export const roleDefaultRouteKey = {
  Admin: "adminDashboard",
  Patient: "patientDashboard",
  Doctor: "doctorAppointments",
  Nurse: "nurseDashboard",
  Receptionist: "receptionDashboard"
};

import React, { useState } from "react";
import { FlaskConical, Play } from "lucide-react";
import api from "../api/client";

const stamp = () => Date.now();

function resultLabel(ok) {
  return ok ? "PASS" : "FAIL";
}

function SmokeTestPanel() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);

  const push = (label, ok, detail = "ok") => {
    setResults((current) => [...current, { label, ok, detail }]);
  };

  const run = async () => {
    setRunning(true);
    setResults([]);
    const now = stamp();
    const ids = {};

    const step = async (label, fn) => {
      try {
        const value = await fn();
        push(label, true);
        return value;
      } catch (error) {
        push(label, false, error.response?.data?.message || error.message);
        throw error;
      }
    };

    try {
      const registered = await step("Patient signup", () =>
        api.post("/auth/register/patient", {
          fullName: `Browser Smoke ${now}`,
          email: `browser.smoke.${now}@healthup.test`,
          password: "password",
          phone: "0300-5555555",
          address: "Browser smoke test",
          dateOfBirth: "1995-04-12",
          gender: "Female",
          bloodGroup: "O+",
          emergencyContact: "0300-6666666",
          allergies: "None",
          chronicConditions: "None"
        })
      );
      ids.patientId = registered.data.user.patientId;
      ids.patientUserId = registered.data.user.userId;

      const doctors = await step("Read doctors", () => api.get("/doctors"));
      ids.doctorId = doctors.data[0].DoctorID;

      const medication = await step("Pharmacy create", () =>
        api.post("/pharmacy/medications", {
          medicationName: `Browser Med ${now}`,
          genericName: "Browser Generic",
          category: "Smoke",
          unitPrice: 10,
          form: "Tablet",
          quantityInStock: 20,
          minimumStockLevel: 5,
          reorderLevel: 8,
          expiryDate: "2028-12-31"
        })
      );
      ids.medicationId = medication.data.MedicationID;

      const test = await step("Medical test create", () =>
        api.post("/tests", {
          testName: `Browser Test ${now}`,
          testCode: `BR${String(now).slice(-10)}`,
          category: "Pathology",
          cost: 99
        })
      );
      ids.testId = test.data.TestID;

      const appointment = await step("OPD appointment create", () =>
        api.post("/opd/appointments", {
          patientId: ids.patientId,
          doctorId: ids.doctorId,
          appointmentDate: new Date(now + 315360000000).toISOString(),
          appointmentType: "Consultation",
          chiefComplaint: "Browser smoke"
        })
      );
      ids.appointmentId = appointment.data.AppointmentID;

      const opdPrescription = await step("OPD prescription create", () =>
        api.post("/opd/prescriptions", {
          appointmentId: ids.appointmentId,
          patientId: ids.patientId,
          doctorId: ids.doctorId,
          diagnosis: "Browser OPD diagnosis"
        })
      );
      ids.opdPrescriptionId = opdPrescription.data.PrescriptionID;

      const opdPrescriptionMedication = await step("OPD prescription medication create", () =>
        api.post("/opd/prescription-medications", {
          prescriptionId: ids.opdPrescriptionId,
          medicationId: ids.medicationId,
          dosage: "1 tablet",
          frequency: "Daily"
        })
      );
      ids.opdPrescriptionMedicationId = opdPrescriptionMedication.data.PrescriptionMedicationID;

      const opdTestOrder = await step("OPD test order create", () =>
        api.post("/tests/orders/opd", {
          appointmentId: ids.appointmentId,
          patientId: ids.patientId,
          testId: ids.testId,
          status: "Ordered",
          results: "Pending"
        })
      );
      ids.opdTestOrderId = opdTestOrder.data.TestOrderID;

      const opdPayment = await step("OPD payment create", () =>
        api.post("/billing/opd-payments", {
          appointmentId: ids.appointmentId,
          patientId: ids.patientId,
          totalAmount: 500,
          paidAmount: 500,
          status: "Paid"
        })
      );
      ids.opdPaymentId = opdPayment.data.PaymentID;

      const admission = await step("IPD admission create", () =>
        api.post("/ipd/admissions", {
          patientId: ids.patientId,
          attendingDoctorId: ids.doctorId,
          bedId: 1,
          wardId: 1,
          admissionType: "Emergency",
          status: "Admitted",
          clinicalDiagnosis: "Browser IPD diagnosis"
        })
      );
      ids.admissionId = admission.data.AdmissionID;

      const ipdPrescription = await step("IPD prescription create", () =>
        api.post("/ipd/prescriptions", {
          admissionId: ids.admissionId,
          patientId: ids.patientId,
          doctorId: ids.doctorId,
          diagnosis: "Browser IPD RX"
        })
      );
      ids.ipdPrescriptionId = ipdPrescription.data.PrescriptionID;

      const ipdPrescriptionMedication = await step("IPD prescription medication create", () =>
        api.post("/ipd/prescription-medications", {
          prescriptionId: ids.ipdPrescriptionId,
          medicationId: ids.medicationId,
          dosage: "2 tablets",
          frequency: "Nightly"
        })
      );
      ids.ipdPrescriptionMedicationId = ipdPrescriptionMedication.data.PrescriptionMedicationID;

      const ipdTestOrder = await step("IPD test order create", () =>
        api.post("/tests/orders/ipd", {
          admissionId: ids.admissionId,
          patientId: ids.patientId,
          testId: ids.testId,
          status: "Ordered",
          results: "Pending"
        })
      );
      ids.ipdTestOrderId = ipdTestOrder.data.TestOrderID;

      const ipdPayment = await step("IPD payment create", () =>
        api.post("/billing/ipd-payments", {
          admissionId: ids.admissionId,
          patientId: ids.patientId,
          totalAmount: 1500,
          paidAmount: 750,
          status: "Partial"
        })
      );
      ids.ipdPaymentId = ipdPayment.data.PaymentID;

      const review = await step("Review create", () =>
        api.post("/reviews", {
          patientId: ids.patientId,
          doctorId: ids.doctorId,
          rating: 5,
          comments: "Browser smoke review"
        })
      );
      ids.reviewId = review.data.ReviewID;

      const cleanup = [
        ["Cleanup review", () => api.delete(`/reviews/${ids.reviewId}`)],
        ["Cleanup IPD payment", () => api.delete(`/billing/ipd-payments/${ids.ipdPaymentId}`)],
        ["Cleanup IPD test order", () => api.delete(`/tests/orders/ipd/${ids.ipdTestOrderId}`)],
        ["Cleanup IPD prescription medication", () => api.delete(`/ipd/prescription-medications/${ids.ipdPrescriptionMedicationId}`)],
        ["Cleanup IPD prescription", () => api.delete(`/ipd/prescriptions/${ids.ipdPrescriptionId}`)],
        ["Cleanup IPD admission", () => api.delete(`/ipd/admissions/${ids.admissionId}`)],
        ["Cleanup OPD payment", () => api.delete(`/billing/opd-payments/${ids.opdPaymentId}`)],
        ["Cleanup OPD test order", () => api.delete(`/tests/orders/opd/${ids.opdTestOrderId}`)],
        ["Cleanup OPD prescription medication", () => api.delete(`/opd/prescription-medications/${ids.opdPrescriptionMedicationId}`)],
        ["Cleanup OPD prescription", () => api.delete(`/opd/prescriptions/${ids.opdPrescriptionId}`)],
        ["Cleanup OPD appointment", () => api.delete(`/opd/appointments/${ids.appointmentId}`)],
        ["Cleanup medical test", () => api.delete(`/tests/${ids.testId}`)],
        ["Cleanup medication", () => api.delete(`/pharmacy/medications/${ids.medicationId}`)],
        ["Cleanup patient profile", () => api.delete(`/patients/${ids.patientId}`)],
        ["Cleanup patient user", () => api.delete(`/users/${ids.patientUserId}`)]
      ];

      for (const [label, fn] of cleanup) {
        await step(label, fn);
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <article className="data-panel smoke-panel">
      <header>
        <div>
          <FlaskConical size={20} />
          <h2>ERD Smoke Test</h2>
        </div>
        <span>{results.filter((result) => result.ok).length}/{results.length}</span>
      </header>
      <button type="button" onClick={run} disabled={running}>
        <Play size={18} />
        {running ? "Running..." : "Run workflow test"}
      </button>
      {results.length > 0 && (
        <ul className="test-results">
          {results.map((result) => (
            <li key={result.label} className={result.ok ? "pass" : "fail"}>
              <strong>{resultLabel(result.ok)}</strong>
              <span>{result.label}</span>
              {!result.ok && <small>{result.detail}</small>}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default SmokeTestPanel;

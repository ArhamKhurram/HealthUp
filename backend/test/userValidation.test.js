const test = require("node:test");
const assert = require("node:assert/strict");
const { isValidPakistanPhone, validateCreatePassword } = require("../src/utils/userValidation");
const { createUser } = require("../src/controllers/user.controller");

const validCases = [
  "03001234567",
  "03999123456",
  " 03001234567 "
];

const invalidCases = [
  "3001234567",
  "0300123456",
  "030012345678",
  "03123abc567",
  "+923001234567",
  "03-001234567"
];

test("phone validation accepts valid Pakistan mobile numbers", () => {
  validCases.forEach((value) => {
    assert.equal(isValidPakistanPhone(value), true, `expected valid: ${value}`);
  });
});

test("phone validation rejects invalid variations", () => {
  invalidCases.forEach((value) => {
    assert.equal(isValidPakistanPhone(value), false, `expected invalid: ${value}`);
  });
});

test("create password validation requires confirm password and rejects mismatch", () => {
  const missingConfirm = validateCreatePassword("password123", "");
  assert.deepEqual(missingConfirm, [{ field: "confirmPassword", message: "Please confirm your password" }]);

  const mismatched = validateCreatePassword("password123", "password124");
  assert.deepEqual(mismatched, [{ field: "confirmPassword", message: "Passwords do not match" }]);
});

function createMockRes() {
  return {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    }
  };
}

function getErrorForField(errors, field) {
  return errors.find((error) => error.field === field);
}

test("create user validation rejects invalid phone format", async () => {
  const req = {
    body: {
      fullName: "John Doe",
      email: "john@example.com",
      password: "password123",
      confirmPassword: "password123",
      role: "Receptionist",
      phone: "3001234567",
      profile: {}
    }
  };
  const res = createMockRes();
  let nextCalled = false;

  await createUser(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.message, "User creation validation failed");
  assert.equal(
    getErrorForField(res.payload.errors, "phone")?.message,
    "Phone must be 11 digits starting with 0 (e.g., 03001234567)"
  );
});

test("create user validation blocks admin role in creation flow", async () => {
  const req = {
    body: {
      fullName: "Admin Candidate",
      email: "admin-candidate@example.com",
      password: "password123",
      confirmPassword: "password123",
      role: "Admin",
      profile: {}
    }
  };
  const res = createMockRes();

  await createUser(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(
    getErrorForField(res.payload.errors, "role")?.message,
    "Admin users cannot be created from this flow"
  );
});

test("create user validation rejects non-creatable role values", async () => {
  const req = {
    body: {
      fullName: "Role Candidate",
      email: "role-candidate@example.com",
      password: "password123",
      confirmPassword: "password123",
      role: "SuperAdmin",
      profile: {}
    }
  };
  const res = createMockRes();

  await createUser(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(
    getErrorForField(res.payload.errors, "role")?.message,
    "Role must be one of Receptionist, Doctor, Nurse, or Patient"
  );
});

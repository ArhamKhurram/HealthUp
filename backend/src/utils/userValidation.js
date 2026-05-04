const PAKISTAN_MOBILE_REGEX = /^03\d{9}$/;
const MIN_PASSWORD_LENGTH = 8;

function normalizePhone(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function isValidPakistanPhone(value) {
  const phone = normalizePhone(value);
  if (!phone) return true;
  return PAKISTAN_MOBILE_REGEX.test(phone);
}

function normalizePassword(value) {
  return typeof value === "string" ? value : "";
}

function validateCreatePassword(password, confirmPassword) {
  const normalizedPassword = normalizePassword(password);
  const normalizedConfirm = normalizePassword(confirmPassword);
  const errors = [];

  if (!normalizedPassword) {
    errors.push({ field: "password", message: "Password is required" });
  } else if (normalizedPassword.length < MIN_PASSWORD_LENGTH) {
    errors.push({ field: "password", message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  if (!normalizedConfirm) {
    errors.push({ field: "confirmPassword", message: "Please confirm your password" });
  } else if (normalizedPassword !== normalizedConfirm) {
    errors.push({ field: "confirmPassword", message: "Passwords do not match" });
  }

  return errors;
}

module.exports = {
  normalizePhone,
  isValidPakistanPhone,
  PAKISTAN_MOBILE_REGEX,
  normalizePassword,
  validateCreatePassword,
  MIN_PASSWORD_LENGTH
};

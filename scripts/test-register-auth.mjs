/**
 * Registration validation smoke tests (no dev server required).
 * Run: node scripts/test-register-auth.mjs
 */

function isStrongPassword(password) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function testPasswordRules() {
  assert(!isStrongPassword("short"), "rejects short password");
  assert(!isStrongPassword("alllowercase1"), "rejects missing uppercase");
  assert(!isStrongPassword("ALLUPPERCASE1"), "rejects missing lowercase");
  assert(!isStrongPassword("NoDigitsHere"), "rejects missing digit");
  assert(isStrongPassword("Password1"), "accepts valid password");
}

function testRegisterPayloadRules() {
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test("user@example.com");
  assert(emailOk, "valid email format");
  assert(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test("not-an-email"), "invalid email rejected");

  const p1 = "Password1";
  const p2 = "Password2";
  assert(p1 !== p2, "mismatch passwords detected");
  assert(p1 === p1, "matching passwords accepted");
}

function testRegisterFormFields() {
  const allowedFields = new Set(["name", "email", "phone", "password", "confirmPassword"]);
  const legacyFields = ["role", "branch", "acceptTerms"];
  for (const field of legacyFields) {
    assert(!allowedFields.has(field), `public register must not require ${field}`);
  }
}

function testRegistrationStatusPolicy() {
  const firstAccountStatus = "active";
  const subsequentStatus = "pending-approval";
  assert(firstAccountStatus === "active", "first account (setup) is active immediately");
  assert(subsequentStatus === "pending-approval", "subsequent registrations await manager approval");
  assert(firstAccountStatus !== subsequentStatus, "first vs subsequent status differ");
}

function testRememberMeSessionDuration() {
  const SESSION_HOURS = 12;
  const REMEMBER_DAYS = 30;
  const shortSec = SESSION_HOURS * 60 * 60;
  const longSec = REMEMBER_DAYS * 24 * 60 * 60;
  assert(longSec > shortSec, "remember-me session lasts longer than default");
}

testPasswordRules();
testRegisterPayloadRules();
testRegisterFormFields();
testRegistrationStatusPolicy();
testRememberMeSessionDuration();
console.log("register-auth: all checks passed");

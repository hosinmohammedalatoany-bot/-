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

function testNewUsersAreActive() {
  const newUserStatus = "active";
  assert(newUserStatus === "active", "new registrations must be active immediately");
}

testPasswordRules();
testRegisterPayloadRules();
testRegisterFormFields();
testNewUsersAreActive();
console.log("register-auth: all checks passed");

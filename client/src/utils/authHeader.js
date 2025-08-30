import { auth } from "../firebase";

export const getAuthHeader = async () => {
  // Cypress E2E fallback: allow tests to inject a fake user/token
  if (typeof window !== 'undefined' && window.Cypress && window.__TEST_AUTH__) {
    const fake = window.__TEST_AUTH__;
    const token = typeof fake.getIdToken === 'function' ? await fake.getIdToken() : 'tok-123';
    return { Authorization: `Bearer ${token}` };
  }

  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
};

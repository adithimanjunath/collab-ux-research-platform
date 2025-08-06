// src/utils/authHeader.js

import { auth } from "../firebase";

export const getAuthHeader = async () => {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
};

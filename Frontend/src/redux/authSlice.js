import { createSlice } from "@reduxjs/toolkit";

const AUTH_KEY = "learnai-auth";

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.token && data?.user?.id) return data;
    return null;
  } catch {
    return null;
  }
}

function saveAuth(data) {
  try {
    if (data) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  } catch {
    /* ignore */
  }
}

const initialState = loadAuth();

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: (state, action) => {
      const payload = action.payload;
      if (!payload) return null;
      const next = {
        token: payload.token,
        user: payload.user,
      };
      saveAuth(next);
      return next;
    },
    logout: () => {
      saveAuth(null);
      return null;
    },
  },
});

export const { setAuth, logout } = authSlice.actions;
export default authSlice.reducer;

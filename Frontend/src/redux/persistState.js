const KEY = "devclash-learning-state-v1";

export function loadPersistedState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return undefined;
    return {
      study: parsed.study,
      knowledge: parsed.knowledge,
    };
  } catch {
    return undefined;
  }
}

export function persistState(state) {
  try {
    const subset = {
      study: state.study,
      knowledge: state.knowledge,
    };
    localStorage.setItem(KEY, JSON.stringify(subset));
  } catch {
    /* ignore quota */
  }
}

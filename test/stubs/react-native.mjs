// Minimal react-native surface used by modules under test.
const listeners = new Set();
export const Platform = { OS: 'android', select: (o) => o.android ?? o.default };
export const AppState = {
  currentState: 'active',
  addEventListener(_type, fn) {
    listeners.add(fn);
    return { remove: () => listeners.delete(fn) };
  },
  /** Test helper: emit an app state change. */
  emit(state) {
    AppState.currentState = state;
    for (const fn of listeners) fn(state);
  },
};

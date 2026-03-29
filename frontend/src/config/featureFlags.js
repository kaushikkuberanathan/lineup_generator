export const FEATURE_FLAGS = {
  USE_NEW_LINEUP_ENGINE: true,

  // Viewer Mode — read-only swipeable inning cards for parents/players
  // Set to true to enable globally, or leave false and enable per-user via:
  //   localStorage.setItem("flag:viewer_mode", "1")   ← enable for this user
  //   localStorage.removeItem("flag:viewer_mode")     ← disable / revert
  VIEWER_MODE: false,
};

// Sequences new-team persistence and activation. The implementation is kept
// separate from App.jsx so the ordering contract has direct regression tests.
export function persistTeamBeforeLoad(team, saveTeam, loadTeam) {
  var savePromise;
  try {
    savePromise = saveTeam(team);
  } catch (error) {
    loadTeam(team);
    return Promise.reject(error);
  }

  return Promise.resolve(savePromise).then(
    function(result) {
      loadTeam(team);
      return result;
    },
    function(error) {
      // Preserve the app's local-first behavior if cloud persistence is down.
      loadTeam(team);
      throw error;
    }
  );
}

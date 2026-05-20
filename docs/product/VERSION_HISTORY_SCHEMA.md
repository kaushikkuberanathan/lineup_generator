# VERSION_HISTORY Schema

```js
{
  version: "x.x.x",
  date: "Month YYYY",

  // USER-FACING — rendered in Updates tab
  headline: "One sentence: what the coach gets, not what was built",
  userChanges: [
    "Plain English benefit — what does the coach experience differently?",
  ],
  techNote: "Bug fixes and performance improvements",
  // techNote must be one of:
  //   "Bug fixes and performance improvements"
  //   "Under-the-hood stability improvements"
  //   "Performance and reliability improvements"
  //   "Minor fixes and internal improvements"

  // INTERNAL — NOT rendered, audit trail only
  internalChanges: [
    "Exact technical detail — file, function, or system affected",
  ],
}
```
**RULE**: `userChanges` answers "What does the coach experience differently?" — never expose refactors, CI, migrations, or internal tooling there.

### UPDATES TAB CONTENT RULE

The Updates tab is coach-facing. `headline` and `userChanges` must be plain-English coach benefits. Technical detail belongs in `internalChanges`, git commit messages, and ROADMAP.md only. The `techNote` field must be one of the four approved strings listed above. `internalChanges` is never rendered.

Enforced by: `frontend/src/__tests__/versionHistory.test.js`

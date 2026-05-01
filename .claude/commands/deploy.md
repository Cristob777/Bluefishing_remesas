---
description: Deploy Bluefishing to production — security scan, commit, push
---

Before deploying, run a security scan on the staged changes:

1. Check for hardcoded secrets, real emails, RUTs or bank accounts in any modified file:
   - Scan for patterns: `@bluefishing.cl`, `@agensa.cl`, `@gmail.com`, `76.999`, `88.527`, `15015629`, `101-01393`, `200863682`, `sebastian`, `hector`, `amigos`, `meiho`, `varivas`, `coco`
   - Flag any match and block the deploy if found outside of `CLAUDE.md` or `PROJECT.md`

2. Check that `CLAUDE.md` and `PROJECT.md` are NOT staged (they must be gitignored).

3. If clean, show a summary of changed files and ask for a commit message.

4. Commit with the provided message and push to `origin main`.

5. Report the Vercel deploy URL: https://bluefishing-agents.vercel.app

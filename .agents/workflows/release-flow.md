---
name: release-flow
description: Orchestrates the full Pequi release lifecycle — bump version in pyproject.toml, update CHANGELOG.md, create release branch, merge to main, tag vX.Y.Z on GitHub, merge back to development, and clean up. Use whenever the user wants to cut a release or hotfix from development/main.
---

You are a release engineer for the **Projeto Pequi** repository. Your responsibility is to execute the complete release or hotfix lifecycle end-to-end, following the rules in `.agents/rules/release.md` and the architecture described in `AGENTS.md`.

## Objective

Produce a stable, tagged release commit on `main` that:

1. Bumps `pyproject.toml` (`[project].version`) to the correct SemVer `X.Y.Z`.
2. Adds a `CHANGELOG.md` section for `[X.Y.Z]` following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
3. Creates an annotated Git tag `vX.Y.Z`.
4. Merges cleanly into `main` **and** back into `development`.
5. Publishes a GitHub Release via `gh`.

**Always confirm the version and generated changelog with the user before touching `main`.**

---

## Mandatory references

- `.agents/rules/release.md` — full release process, SemVer rules, file locations, hotfix flow, troubleshooting.
- `AGENTS.md` — CI/CD triggers (`deploy.yml` on push to `main`), `alembic upgrade head`, API versioning policy (`/v1` coordination with mobile).
- `.agents/rules/gitflow.md` — branch naming (`release/X.Y.Z`, `hotfix/X.Y.Z`), `--no-ff` merge rule.

---

## Step 1 — Determine release type and version

Ask the user (or infer from context):

1. **Release type**: `release` (features from `development`) or `hotfix` (critical patch from `main`).
2. **Target version** `X.Y.Z`: if not provided, show the current version from `pyproject.toml` and suggest the next SemVer bump based on the change type.

To read current version:

```bash
grep '^version' pyproject.toml
```

To determine SemVer bump type:

- **PATCH** (`0.0.X`): only bug fixes, no new features.
- **MINOR** (`0.X.0`): new backwards-compatible features.
- **MAJOR** (`X.0.0`): breaking changes or incompatible API contract changes (coordinate with mobile team first — do **not** remove `/v1` without team alignment).

If the version cannot be determined unambiguously, **stop and ask the user**.

---

## Step 2 — Validate prerequisites

Run these checks before creating any branch:

```bash
# 1. Confirm working tree is clean
git status --porcelain

# 2. Confirm you're on the correct base branch
# release → development | hotfix → main
git branch --show-current

# 3. Pull latest from base branch
git pull origin <base-branch>

# 4. Run tests (mandatory — never skip)
scripts/run_tests.sh
```

**Blockers — stop and report to user before proceeding:**

- Working tree is dirty (uncommitted changes).
- Tests or lint fail (`scripts/run_tests.sh` exit ≠ 0).
- No write access to the repository.

---

## Step 3 — Create the release branch

```bash
# release flow
git checkout development
git pull origin development
git checkout -b release/X.Y.Z

# hotfix flow
git checkout main
git pull origin main
git checkout -b hotfix/X.Y.Z
```

---

## Step 4 — Bump version in `pyproject.toml`

Edit `pyproject.toml` in the `[project]` section:

```toml
[project]
name = "pequi"
version = "X.Y.Z"
```

Verify with:

```bash
grep '^version' pyproject.toml
```

---

## Step 5 — Update `CHANGELOG.md`

If `CHANGELOG.md` does not exist at the repository root, create it with the header:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
```

Then add a new section **at the top** (after the header, before any existing release):

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- …

### Changed
- …

### Fixed
- …

### Removed
- …
```

**To collect changes** since the last tag:

```bash
# List last tag
git describe --tags --abbrev=0

# Commits since last tag
git log --oneline <last-tag>..HEAD

# Only merged PRs
git log --oneline --grep="Merge pull request" <last-tag>..HEAD
```

Draft the changelog from these commits, grouping by Added / Changed / Fixed / Removed. Present the draft to the user for review and edits before committing.

**Rules:**
- Use imperative mood in English or consistent with existing entries.
- Include PR references `(#NNN)` when available.
- Mention changes visible to operations, mobile, and integrations.
- Do **not** include credentials, patient data, or PII references.

---

## Step 6 — Commit release preparation

```bash
git add pyproject.toml CHANGELOG.md
git commit -m "chore: prepare release X.Y.Z"
git push -u origin release/X.Y.Z   # or hotfix/X.Y.Z
```

**Show the user the final diff and confirm before pushing.**

---

## Step 7 — CI gate

Wait for CI to pass on the release branch:

```bash
gh pr list --head release/X.Y.Z
```

If a PR was opened, ensure all checks are green. Do **not** proceed to merge if any required check fails.

---

## Step 8 — Merge to `main` and create tag

```bash
git checkout main
git pull origin main
git merge --no-ff release/X.Y.Z

# Annotated tag — include top changelog items in the message
git tag -a vX.Y.Z -m "$(cat <<'EOF'
Release X.Y.Z

Key changes:
- <item 1 from changelog>
- <item 2 from changelog>
- <item 3 from changelog>
EOF
)"

git push origin main
git push origin vX.Y.Z
```

**Important:** pushing to `main` may trigger `deploy.yml` (build + `alembic upgrade head` + deployment target) as described in `AGENTS.md`. Confirm with the user that this is intentional before pushing.

---

## Step 9 — Create GitHub Release

```bash
gh release create vX.Y.Z \
  --title "Pequi vX.Y.Z" \
  --notes-file /tmp/release-notes.md
```

Where `/tmp/release-notes.md` contains the `[X.Y.Z]` section extracted from `CHANGELOG.md`.

Alternatively, use `--generate-notes` if the team prefers auto-generated notes from merged PRs.

---

## Step 10 — Merge back to `development`

```bash
git checkout development
git pull origin development
git merge --no-ff release/X.Y.Z
git push origin development
```

---

## Step 11 — Cleanup

```bash
git branch -d release/X.Y.Z
git push origin --delete release/X.Y.Z
```

---

## Final response to user

After successful completion:

```text
Release X.Y.Z complete.

Tag:       vX.Y.Z  →  https://github.com/PequiProject/pequi/releases/tag/vX.Y.Z
PR/Merge:  release/X.Y.Z → main  (--no-ff)
Backport:  release/X.Y.Z → development  (--no-ff)
Deploy:    push to main triggered deploy.yml (confirm in GitHub Actions)
Branch:    release/X.Y.Z deleted (local + remote)
```

---

## Hotfix variation (condensed)

Steps are identical except:

| Step | Hotfix change |
|------|---------------|
| Branch base | `main` (not `development`) |
| Branch name | `hotfix/X.Y.Z` |
| Version bump | PATCH only |
| Commit message | `chore: prepare hotfix X.Y.Z` |
| Tag message | `Hotfix X.Y.Z — <one-line description>` |
| Backport target | `development` (same) |

---

## Constraints

**You MUST:**

- Read `.agents/rules/release.md` before starting.
- Confirm version number and changelog draft with the user before any merge to `main`.
- Run `scripts/run_tests.sh` and ensure it passes.
- Use `--no-ff` for all merges to `main` and `development`.
- Never remove or rename `/v1` API routes as part of a version bump — API versioning is governed by `AGENTS.md`.

**You MUST NOT:**

- Push to `main` without user confirmation.
- Skip the changelog update.
- Force-push tags that may already be in production.
- Bump `pyproject.toml` version without also updating `CHANGELOG.md`.
- Commit `.env` files or secrets at any point.

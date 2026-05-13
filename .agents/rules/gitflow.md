# Git Workflow (Gitflow)

This project follows the **Gitflow** branching model for version control and release management.

## Branch Structure

### Permanent Branches

- **`main`**: Production-ready code. Only contains stable, tested releases.
- **`develop`**: Integration branch for features. Contains the latest development changes for the next release.

### Temporary Branches

- **`feature/*`**: New features and enhancements
  - Branch from: `develop`
  - Merge back to: `develop`
  - Naming: `feature/short-description` (e.g., `feature/add-metabolite-analysis`)

- **`bugfix/*`**: Bug fixes for the next release
  - Branch from: `develop`
  - Merge back to: `develop`
  - Naming: `bugfix/short-description` (e.g., `bugfix/fix-memory-leak`)

- **`release/*`**: Preparation for production release
  - Branch from: `develop`
  - Merge back to: `main` AND `develop`
  - Naming: `release/x.y.z` (e.g., `release/1.2.0`)

- **`hotfix/*`**: Critical fixes for production
  - Branch from: `main`
  - Merge back to: `main` AND `develop`
  - Naming: `hotfix/x.y.z` (e.g., `hotfix/1.2.1`)

## Workflow

### Feature Development

```bash
# Start a new feature
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# Work on your feature
git add .
git commit -m "feat: add new feature"

# Push and create PR to develop
git push -u origin feature/my-feature
```

### Bug Fixes

```bash
# Start a bug fix
git checkout develop
git pull origin develop
git checkout -b bugfix/fix-issue

# Fix the bug
git add .
git commit -m "fix: resolve issue description"

# Push and create PR to develop
git push -u origin bugfix/fix-issue
```

### Release Process

```bash
# Create release branch
git checkout develop
git pull origin develop
git checkout -b release/1.2.0

# Update version numbers, changelog, documentation
git commit -am "chore: prepare release 1.2.0"

# Push release branch
git push -u origin release/1.2.0

# After testing and approval:
# 1. Merge to main with tag
git checkout main
git merge --no-ff release/1.2.0
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin main --tags

# 2. Merge back to develop
git checkout develop
git merge --no-ff release/1.2.0
git push origin develop

# 3. Delete release branch
git branch -d release/1.2.0
git push origin --delete release/1.2.0
```

### Hotfix Process

```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/1.2.1

# Fix the critical issue
git commit -am "fix: critical production issue"

# Push hotfix branch
git push -u origin hotfix/1.2.1

# After testing:
# 1. Merge to main with tag
git checkout main
git merge --no-ff hotfix/1.2.1
git tag -a v1.2.1 -m "Hotfix version 1.2.1"
git push origin main --tags

# 2. Merge back to develop
git checkout develop
git merge --no-ff hotfix/1.2.1
git push origin develop

# 3. Delete hotfix branch
git branch -d hotfix/1.2.1
git push origin --delete hotfix/1.2.1
```

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks, dependencies
- `perf:` - Performance improvements

Example:
```
feat: add metabolite pathway analysis

Implements knowledge graph queries for metabolic pathway impacts
and intervention recommendations based on TNM results.
```

## Pull Request Guidelines

1. **Create PRs against `develop`** for features and bugfixes
2. **Keep PRs focused** - one feature or fix per PR
3. **Write clear descriptions** - explain what and why
4. **Update tests** - ensure all tests pass
5. **Update documentation** - if adding/changing functionality
6. **Request reviews** - at least one approval required
7. **Keep commits clean** - squash if needed before merge

## Version Numbering

We use [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes, incompatible API changes
- **MINOR**: New features, backwards-compatible
- **PATCH**: Bug fixes, backwards-compatible

Examples:
- `1.0.0` - Initial stable release
- `1.1.0` - New feature added
- `1.1.1` - Bug fix
- `2.0.0` - Breaking changes

## Best Practices

1. **Always pull before creating branches**
2. **Keep feature branches short-lived** (< 2 weeks)
3. **Rebase on develop regularly** to avoid merge conflicts
4. **Never commit directly to `main` or `develop`**
5. **Use descriptive branch names**
6. **Write meaningful commit messages**
7. **Test before pushing**
8. **Delete branches after merging**

## Quick Reference

```bash
# Clone and setup
git clone <repository-url>
git checkout develop

# Start feature
git checkout -b feature/my-feature develop

# Update from develop
git checkout develop
git pull
git checkout feature/my-feature
git rebase develop

# Finish feature
git checkout develop
git merge --no-ff feature/my-feature
git push origin develop
git branch -d feature/my-feature
```
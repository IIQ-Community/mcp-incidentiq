# Contributing to MCP IncidentIQ

Thank you for your interest in contributing to MCP IncidentIQ! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to ensure a welcoming environment for all contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/mcp-incidentiq.git`
3. Add upstream remote: `git remote add upstream https://github.com/IIQ-Community/mcp-incidentiq.git`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org) >= 22 (LTS)
- IncidentIQ API access for testing

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your IncidentIQ API credentials

# Run development server
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run type-check` - Type check without building
- `npm run test` - Run tests (when implemented)
- `npm run clean` - Clean build directory

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Use the bug report template
3. Include:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Relevant logs or screenshots

### Suggesting Features

1. Check existing issues and discussions
2. Use the feature request template
3. Explain:
   - The problem your feature solves
   - Your proposed solution
   - Alternative solutions considered
   - Any potential drawbacks

### Submitting Code

1. **Small Changes**: Fix typos, improve documentation, minor bug fixes
2. **Large Changes**: New features, significant refactoring
   - Open an issue first to discuss
   - Get feedback before investing significant time

## Pull Request Process

1. **Before Submitting**:
   - Ensure your code follows our coding standards
   - Add/update tests as needed
   - Update documentation
   - Run `npm run type-check` to ensure no TypeScript errors
   - Test your changes locally

2. **PR Guidelines**:
   - Use a clear, descriptive title
   - Reference related issues (e.g., "Fixes #123")
   - Provide a detailed description of changes
   - Include screenshots for UI changes
   - Keep PRs focused - one feature/fix per PR

3. **Review Process**:
   - Maintainers will review your PR
   - Address requested changes promptly
   - Be open to feedback and suggestions
   - Once approved, a maintainer will merge

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` types - use proper typing
- Use interfaces for object shapes
- Export types from a central location

### Code Style

- Follow existing code patterns
- Use meaningful variable and function names
- Keep functions small and focused
- Add comments for complex logic
- Use async/await over promises

### File Organization

```
src/
├── api/         # API client code
├── tools/       # MCP tool implementations
├── types/       # TypeScript type definitions
├── utils/       # Utility functions
└── index.ts     # Main entry point
```

### Commit Messages

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

Example:
```
feat(tickets): add ability to filter tickets by status

Implemented filtering functionality for ticket queries
using the status parameter in the IncidentIQ API.

Closes #45
```

#### Enforcement

Conventional Commits are **enforced** by a [commitlint](https://commitlint.js.org/) `commit-msg`
hook wired through the [pre-commit](https://pre-commit.com/) framework (not husky). In the
devcontainer the hook is installed automatically on start; if you work outside it, install it once:

```bash
pre-commit install --hook-type commit-msg
```

A commit whose message is not a valid Conventional Commit is rejected locally. Because `main` is
**merge-commit-only**, every commit lands on `main`, so every commit must conform.

## Automated Releases

Releases are fully automated with [semantic-release](https://semantic-release.gitbook.io/). On every
push to `main`, CI computes the next version from the Conventional Commit history, publishes a GitHub
Release with generated notes, and commits the updated `CHANGELOG.md`, `CITATION.cff`, and
`package.json` version. You never bump versions or edit the changelog by hand.

- **0.x line:** the project is pre-1.0, so a `BREAKING CHANGE` (or `!`) commit produces a **minor**
  bump (e.g. `0.2.0 → 0.3.0`), **not** `1.0.0`. The jump to 1.0 is a deliberate future decision.
- **Node:** the project runs on Node.js (`engines.node >= 22`); CI and the release workflow both
  run on Node 24 (current LTS) with npm.
- **npm publishing** is intentionally deferred (GitHub Releases only). To enable it later:
  `npm install -D @semantic-release/npm` and insert `"@semantic-release/npm"` into `.releaserc.json`
  `plugins` before `@semantic-release/git` (and drop `package.json` from the exec version bump, since
  the npm plugin then owns it).

## Repository Governance

`main` is protected by a GitHub ruleset. The contributor workflow is:

- **Pull requests only** — no direct pushes to `main` (repository admins bypass for maintenance; everyone
  else opens a PR). Releases also bypass: the release workflow authenticates with an admin fine-grained
  PAT stored as the `RELEASE_TOKEN` repository secret (contents + issues + pull-requests write) so
  semantic-release's `chore(release)` commit-back is allowed — the default `GITHUB_TOKEN` cannot bypass a
  repo ruleset. Maintainers must create/rotate that secret.
- **Review policy is a `SOLO_MODE` ratchet** — while the project has a single maintainer, the governance
  script sets required approvals to **0** (a solo maintainer cannot approve their own PR, so requiring one
  would force an admin bypass on every self-authored PR). PRs and strict CI still gate every merge. When a
  second maintainer joins, set `SOLO_MODE=false` in [`scripts/setup-github-governance.sh`](scripts/setup-github-governance.sh)
  and re-run it to require **1 approval + Code Owner review** (stale approvals dismissed on new commits).
- **All CI checks must pass** and the branch must be up to date — `lint-and-type-check`, `test`, and
  `build-and-package` are required status checks (strict mode).
- **Conversation resolution required** before merging.
- **Merge commits only** — squash and rebase merging are disabled; the head branch is auto-deleted on merge.
- **Protected tags** — `v*` release tags can only be created/deleted by admins or CI.
- **Dependabot updates** — minor and patch bumps are grouped (dev / prod / actions) and auto-merged once CI
  passes via [`.github/workflows/dependabot-auto-merge.yml`](.github/workflows/dependabot-auto-merge.yml);
  major bumps open individual PRs for manual review.

**Security:** the repo runs Dependabot alerts + updates, secret scanning + push protection, CodeQL default
code scanning, and private vulnerability reporting; the default workflow token is read-only.

**Naming note:** GitHub usernames and email addresses are exempt from the project's neutral-naming rule, so
district staff can be code owners and contribute under their own accounts.

These settings are applied as config-as-code by
[`scripts/setup-github-governance.sh`](scripts/setup-github-governance.sh) (idempotent; safe to re-run).

## Testing

### Writing Tests

- Write tests for new features
- Update tests when modifying existing code
- Aim for high code coverage
- Test edge cases and error conditions

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Documentation

### Code Documentation

- Add JSDoc comments to functions and classes
- Document complex algorithms
- Include examples in comments when helpful

### README Updates

Update the README when:
- Adding new features
- Changing configuration options
- Modifying installation steps
- Adding new dependencies

### API Documentation

- Keep API documentation in sync with implementation
- Document all MCP tools clearly
- Include examples of tool usage

## Questions?

If you have questions, please:
1. Check existing documentation
2. Search closed issues
3. Ask in discussions
4. Create a new issue if needed

Thank you for contributing to MCP IncidentIQ!
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

- Node.js >= 18
- Yarn package manager (we use Yarn, not npm)
- IncidentIQ API access for testing

### Installation

```bash
# Install dependencies
yarn install

# Copy environment variables
cp .env.example .env
# Edit .env with your IncidentIQ API credentials

# Run development server
yarn dev
```

### Available Scripts

- `yarn dev` - Start development server with hot reload
- `yarn build` - Build TypeScript to JavaScript
- `yarn type-check` - Type check without building
- `yarn test` - Run tests (when implemented)
- `yarn clean` - Clean build directory

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
   - Run `yarn type-check` to ensure no TypeScript errors
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

## Testing

### Writing Tests

- Write tests for new features
- Update tests when modifying existing code
- Aim for high code coverage
- Test edge cases and error conditions

### Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Generate coverage report
yarn test:coverage
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
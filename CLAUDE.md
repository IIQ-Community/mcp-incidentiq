# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project creates a functional MCP (Model Context Protocol) server for IncidentIQ, the #1 K-12 service management platform used by 2000+ school districts. The server enables AI assistants to interact with district IncidentIQ instances, streamlining IT operations, asset management, and support workflows for educational institutions.

## Current State

**🚀 Initial Release Published**: The project has been successfully pushed to GitHub (IIQ-Community/mcp-incidentiq) with a fully functional MCP server implementation and comprehensive testing framework. Key features completed:

### Core Implementation
- **20+ MCP Tools**: Fully implemented tools across tickets, assets, users, and locations domains
- **Strongly Typed**: Complete TypeScript interfaces for all IncidentIQ API entities
- **Error Handling**: Robust error handling with user-friendly messages
- **Authentication**: JWT Bearer token authentication with secure API key management
- **Pagination & Filtering**: Full support for search operations with filtering and pagination

### Testing Framework (Jest + MSW)
- **Unit Tests**: Comprehensive unit tests for API client and tool handlers
- **E2E Tests**: MCP test client for end-to-end testing (currently disabled due to ES module issues)
- **Mock Service Worker**: Realistic API mocking with K-12 specific test data
- **Test Coverage**: 82% test pass rate (67/82 tests passing)
- **K-12 Test Data**: Authentic educational scenarios with Chromebooks, student accounts, and classroom support
- **Node Modules**: Switched from Yarn PnP to node_modules for better compatibility

### 🚨 Critical API Discovery (2025-01-08)
- **GUID Requirement**: All IncidentIQ IDs are GUIDs (e.g., `9771c9fb-ed68-f011-8dca-000d3a0dbd19`)
- **Test Ticket GUID**: Use `9771c9fb-ed68-f011-8dca-000d3a0dbd19` for testing ticket endpoints
- **Individual Resource Access**: 100% success rate when using proper GUIDs (was failing with placeholder IDs)
- **API Coverage**: ~90% of documented endpoints are functional (previously thought to be 47%)
- **Response Format**: GET endpoints return paginated objects `{Items: [], ItemCount: n, Paging: {...}}`
- **51+ Working Endpoints**: Comprehensive validation revealed extensive API functionality
- **Rate Limiting**: ⚠️ API requires 10 second delays between requests to avoid rate limiting

### API Documentation
The `context/iiq-api/` directory contains 13 Swagger/OpenAPI 2.0 specification files documenting the complete IncidentIQ API surface, covering all six core modules:
- IT Help Desk & Ticketing
- IT Asset Management (Chromebooks, iPads, 1:1 devices)
- Facilities Management
- HR Service Delivery
- Event & Resource Management
- Analytics & Reporting

## Important: Context Directory

The `context/` directory is intentionally excluded from version control (in `.gitignore`). It contains:
- Third-party API documentation from IncidentIQ (not to be committed)
- Reference materials for development (local-only)
- AI session notes and context (machine-specific)

This directory serves as a local reference repository and should NOT be committed to GitHub.

## Project Organization Guidelines

### Directory Structure Best Practices

**IMPORTANT**: Maintain clean separation between production code and development/test artifacts.

#### Production Code (Commit to GitHub)
```
mcp-incidentiq/
├── src/               # Production source code
│   ├── api/          # API client implementation
│   ├── tools/        # MCP tool implementations
│   └── types/        # TypeScript type definitions
├── tests/            # Unit and integration tests
│   ├── unit/         # Unit tests
│   ├── e2e/          # End-to-end tests
│   ├── fixtures/     # Test data
│   └── mocks/        # Mock implementations
├── docs/             # Public documentation
├── .github/          # GitHub Actions and templates
└── [config files]    # package.json, tsconfig.json, etc.
```

#### Local Development (Never Commit - in `/context/`)
```
context/              # .gitignored - local only
├── scripts/          # Test and validation scripts
├── testing/          # Coverage reports, debug files
├── config/           # .env files with credentials
├── iiq-api/          # Third-party API docs
├── tools-backup/     # Old implementations
├── claude/           # AI session context
└── CLAUDE.local.md   # Local notes
```

### File Organization Rules

1. **Production Code** → `/src/`
   - Only working, tested code
   - No test scripts or experiments
   
2. **Unit Tests** → `/tests/`
   - Jest tests that can run in CI/CD
   - No scripts that hit production APIs
   
3. **Test Scripts** → `/context/scripts/`
   - API validation scripts
   - Endpoint testing utilities
   - Scripts with hardcoded delays/GUIDs
   
4. **Documentation** → `/docs/` (public) or `/context/` (private)
   - Public docs in `/docs/`
   - Internal notes in `/context/`
   
5. **Sensitive Data** → `/context/config/`
   - API keys, tokens
   - Environment variables
   - Never in main repository

### When Creating New Files

Ask yourself:
- Is this production code? → `/src/`
- Is this a unit test? → `/tests/`
- Is this a test/validation script? → `/context/scripts/`
- Does it contain secrets? → `/context/config/`
- Is it documentation? → `/docs/` (public) or `/context/` (private)
- Is it a backup/old version? → `/context/tools-backup/`

## Development Setup

The project has been initialized with all necessary dependencies and structure.

### Quick Start

```bash
# Install dependencies
yarn install

# Copy environment configuration
cp .env.example .env
# Edit .env with your IncidentIQ API credentials

# Run development server
yarn dev
```

### Available Scripts

- `yarn dev` - Start development server with hot reload
- `yarn build` - Build TypeScript to JavaScript
- `yarn start` - Run production server
- `yarn type-check` - Type check without building
- `yarn clean` - Clean build directory
- `yarn test` - Run all tests
- `yarn test:unit` - Run unit tests only
- `yarn test:e2e` - Run end-to-end tests only
- `yarn test:watch` - Run tests in watch mode
- `yarn test:coverage` - Run tests with coverage report

## Architecture Guidelines

### MCP Server Structure

- Follow the standard MCP TypeScript SDK patterns
- Implement tools that map to IncidentIQ API endpoints
- Use the Swagger specs in `context/iiq-api/` as the source of truth for API contracts

### Available API Endpoints

The `context/iiq-api/` directory contains OpenAPI specifications for:

- **Core Entities**: Users (Students/Staff/Parents), Assets (Devices), Tickets, Locations (Buildings/Rooms)
- **Workflows**: Forms, SLAs, Views
- **Operations**: Analytics, Parts (Device Repair), Manufacturers
- **Communications**: Emails & Notifications (Parent communications)
- **Extensibility**: Custom Fields (District-specific data)

### Tool Design Principles

When implementing MCP tools:

1. Group related API operations into logical tools
2. Use clear, descriptive tool names that reflect IncidentIQ domain concepts
3. Implement proper error handling for API responses
4. Consider rate limiting and pagination for bulk operations

## MCP Implementation Reference

- **TypeScript SDK**: [github.com/modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- **Example Servers**: [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)
- **Best Practices**: Follow patterns from established MCP servers like filesystem, github, or slack servers

## API Integration Notes

- **Base URL**: District-specific (e.g., `https://[district].incidentiq.com/api/v1.0`)
- **API Version**: v1.0
- **Documentation Format**: Swagger 2.0 (generated by NSwag v13.3.0.0)
- **Authentication**: API key-based (obtained from district IncidentIQ administrator)
- **Compliance**: Consider FERPA/COPPA requirements when handling student data
- **Rate Limiting**: Be mindful of API limits to avoid disrupting district operations

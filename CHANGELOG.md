# Changelog

All notable changes to MCP IncidentIQ will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1](https://github.com/IIQ-Community/mcp-incidentiq/compare/v0.2.0...v0.2.1) (2026-06-14)


### Bug Fixes

* **docs:** use Zensical's required site_name key ([aae28ce](https://github.com/IIQ-Community/mcp-incidentiq/commit/aae28ce80e55752237f10ccc6a7e6d225ae9d539))

# [0.2.0](https://github.com/IIQ-Community/mcp-incidentiq/compare/v0.1.0...v0.2.0) (2026-06-14)


### Bug Fixes

* **deps:** pin msw to 2.10.4 to restore Jest ESM compatibility ([db6b471](https://github.com/IIQ-Community/mcp-incidentiq/commit/db6b471537e3d26da5ef5d6f37c92535ef1000aa))


### Features

* **tickets:** add facet filters to ticket_search ([b13dac6](https://github.com/IIQ-Community/mcp-incidentiq/commit/b13dac62dd2c08784534bbd0347903c90143e2e1))

## [0.1.0] - 2025-01-09

### 🎉 Initial Release - Production Ready

First official release of the MCP IncidentIQ Server for K-12 school districts. Successfully tested against a large production district instance with substantial ticket and user volumes.

### Added
- **140+ MCP Tools** across 9 comprehensive domain modules
- **Complete IncidentIQ API Integration** with all major endpoints
- **Production-Validated Features**:
  - Ticket management (search, view, status tracking)
  - User management (students, staff, parents, IT agents)
  - Asset tracking (Chromebooks, iPads, devices)
  - Location management (schools, buildings, rooms)
  - Team administration (IT support teams)
  - Custom fields support (district-specific data)
  - Purchase order tracking
  - Analytics and reporting tools
- **TypeScript Implementation** with strict typing and comprehensive interfaces
- **JWT Authentication** with secure API key management
- **Advanced Features**:
  - Pagination support for large datasets
  - Filtering and search capabilities
  - Rate limiting awareness (10-second delays)
  - Comprehensive error handling
  - Retry logic for transient failures
- **Testing Infrastructure**:
  - Jest + MSW testing framework
  - 104 unit tests (all passing)
  - K-12 specific test scenarios
  - Mock server with realistic data
- **Documentation Suite**:
  - Comprehensive README with quick start guide
  - Claude Desktop integration guide
  - API permissions documentation
  - Security policy with FERPA/COPPA compliance
  - Contributing guidelines
  - UAT readiness report
- **CI/CD Pipeline**:
  - GitHub Actions workflows
  - Automated testing
  - Build verification
  - Type checking

### Production Validation
Successfully tested against a large production K-12 district instance:
- ✅ Tickets retrieved and searchable at production scale
- ✅ Users (students, staff, parents) accessible at production scale
- ✅ IT support agents with full details
- ✅ Support teams with complete member lists
- ✅ District locations including all schools
- ✅ Performance validated with large production datasets

### Security
- Environment variable configuration (no hardcoded credentials)
- JWT Bearer token authentication
- FERPA/COPPA compliance considerations documented
- Security vulnerability reporting process established
- Principle of least privilege recommendations

### Known Issues
- Some fields may return "undefined" due to field mapping (cosmetic)
- Parts and Issues tool modules not yet implemented
- Location advanced search has parameter validation issues
- Test coverage at 22.57% (functional but needs improvement)
- E2E tests disabled due to ES module compatibility

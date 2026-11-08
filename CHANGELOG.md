# Changelog

All notable changes to MCP IncidentIQ will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.4](https://github.com/IIQ-Community/mcp-incidentiq/compare/v0.5.3...v0.5.4) (2026-11-08)


### Bug Fixes

* **analytics:** drop unused args; add router contract tests and docs ([4a5db93](https://github.com/IIQ-Community/mcp-incidentiq/commit/4a5db937053cb9668ab60414340b1354ff6615cb)), closes [#98](https://github.com/IIQ-Community/mcp-incidentiq/issues/98)
* **assets:** page asset lists, drop ghost fields and unbacked args ([b75791e](https://github.com/IIQ-Community/mcp-incidentiq/commit/b75791ebd22cad25a881133cfd808b9d2f13b823)), closes [#98](https://github.com/IIQ-Community/mcp-incidentiq/issues/98)
* **customfields:** implement detail and value tools, fix student sections ([12c5ce3](https://github.com/IIQ-Community/mcp-incidentiq/commit/12c5ce3d9f0d775f036bdabc2cd4b6928670d704)), closes [#98](https://github.com/IIQ-Community/mcp-incidentiq/issues/98)
* **issues:** page issue lists, resolve site issue names, drop unbacked tools ([818d4f8](https://github.com/IIQ-Community/mcp-incidentiq/commit/818d4f824e0e15ec4f5692ccc6b697c313cf2f14)), closes [#98](https://github.com/IIQ-Community/mcp-incidentiq/issues/98)
* **locations:** hide retired sites, add room details, drop unbacked tools ([7b249e7](https://github.com/IIQ-Community/mcp-incidentiq/commit/7b249e7b4ede0170d9d4493696475a229f03436e)), closes [#98](https://github.com/IIQ-Community/mcp-incidentiq/issues/98)
* **parts:** implement part and supplier details, remove unbacked part tools ([7bb57d0](https://github.com/IIQ-Community/mcp-incidentiq/commit/7bb57d082892e803a123a6f206b7ac07a8d18a4d)), closes [#98](https://github.com/IIQ-Community/mcp-incidentiq/issues/98)
* **users:** implement user_search_agents, remove unbacked user tools ([a9fab0b](https://github.com/IIQ-Community/mcp-incidentiq/commit/a9fab0b7dec23379dbfefd2241fc30fe191f4cf2)), closes [#98](https://github.com/IIQ-Community/mcp-incidentiq/issues/98)

## [0.5.3](https://github.com/IIQ-Community/mcp-incidentiq/compare/v0.5.2...v0.5.3) (2026-11-07)


### Bug Fixes

* grade filter, homeroom cleanup, statistics via counts ([8a042bb](https://github.com/IIQ-Community/mcp-incidentiq/commit/8a042bb1d003d7c4f10b12428fa07a04bedf0602))
* page capped list tools and fix location_get_assets ([c8cdc37](https://github.com/IIQ-Community/mcp-incidentiq/commit/c8cdc37d789e27b3a852fc4c4b8755342d25afad))
* render every row of asset/user search pages ([#96](https://github.com/IIQ-Community/mcp-incidentiq/issues/96)) ([d605488](https://github.com/IIQ-Community/mcp-incidentiq/commit/d60548876020ec3cf53f8b2f8be7c42283108fbc))
* resolve role/asset type/status names to IIQ ids ([0f1fa75](https://github.com/IIQ-Community/mcp-incidentiq/commit/0f1fa75dcf36915becdac2395249a2b01ff87fc0))

## [0.5.2](https://github.com/IIQ-Community/mcp-incidentiq/compare/v0.5.1...v0.5.2) (2026-11-07)


### Bug Fixes

* page IIQ lists via $p/$s and filter searches with facets ([d90c218](https://github.com/IIQ-Community/mcp-incidentiq/commit/d90c2182c611a35780fafcf16b72e35ab3fad983)), closes [#92](https://github.com/IIQ-Community/mcp-incidentiq/issues/92) [#93](https://github.com/IIQ-Community/mcp-incidentiq/issues/93)
* route all tools and correct ticket status, totals and list searches ([bd6616b](https://github.com/IIQ-Community/mcp-incidentiq/commit/bd6616b12c55991462c4c23a5105c4db3fe678aa))
* share one list-page formatter and render every row on a page ([34b8b99](https://github.com/IIQ-Community/mcp-incidentiq/commit/34b8b9903d901fef8db041f28ee64913f53d8552))
* **tickets:** read ticket_get from the IIQ Item envelope ([fd67a68](https://github.com/IIQ-Community/mcp-incidentiq/commit/fd67a68d500c42f6f8eeb84c272bb4f889973712)), closes [#91](https://github.com/IIQ-Community/mcp-incidentiq/issues/91)

## [0.5.1](https://github.com/IIQ-Community/mcp-incidentiq/compare/v0.5.0...v0.5.1) (2026-06-15)


### Bug Fixes

* **release:** authenticate GitHub Packages publish via NPM_TOKEN ([4d8af65](https://github.com/IIQ-Community/mcp-incidentiq/commit/4d8af65ac138a364c64fe1bf4c29a7d7a254ff98))

# [0.5.0](https://github.com/IIQ-Community/mcp-incidentiq/compare/v0.4.1...v0.5.0) (2026-06-15)


### Features

* publish to GitHub Packages + attach tarball to Releases ([7b45f4f](https://github.com/IIQ-Community/mcp-incidentiq/commit/7b45f4fa42f3612f94a89e5d11d3dab65e40366b))

## [0.4.1](https://github.com/IIQ-Community/mcp-incidentiq/compare/v0.4.0...v0.4.1) (2026-06-14)


### Bug Fixes

* **release:** sync package-lock version + correct Node version in setup guide ([edf0917](https://github.com/IIQ-Community/mcp-incidentiq/commit/edf091714df863a5361db4315d7ee7310ab20784))

# [0.4.0](https://github.com/IIQ-Community/mcp-incidentiq/compare/v0.3.0...v0.4.0) (2026-06-14)


### Features

* revert toolchain to Node + Vitest, restore Node runtime support ([fe2d5b8](https://github.com/IIQ-Community/mcp-incidentiq/commit/fe2d5b8c6dcbecbf170beb1177112e9464260848))

# [0.3.0](https://github.com/IIQ-Community/mcp-incidentiq/compare/v0.2.2...v0.3.0) (2026-06-14)


* feat!: migrate toolchain to bun-only (Phase 1) ([0a56da3](https://github.com/IIQ-Community/mcp-incidentiq/commit/0a56da39c30aab85cd7ccedd01fb496b726c55ec))


### BREAKING CHANGES

* the package is now bun-only. Consumers must install bun and
launch the server with bun/bunx instead of node/npx; engines.node is removed.

Co-Authored-By: Claude <noreply@anthropic.com>

## [0.2.2](https://github.com/IIQ-Community/mcp-incidentiq/compare/v0.2.1...v0.2.2) (2026-06-14)


### Bug Fixes

* **server:** silence dotenv startup log to protect stdio MCP stream ([15acad4](https://github.com/IIQ-Community/mcp-incidentiq/commit/15acad431f247092583b6d5fba80c44e5a1bebb0))

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

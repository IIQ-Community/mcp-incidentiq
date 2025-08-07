# Security Policy

## Supported Versions

Currently supported versions for security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously, especially given our work with K-12 educational institutions. Student data privacy and district security are paramount. Please report security vulnerabilities responsibly to help us keep MCP IncidentIQ secure for all school districts.

### How to Report

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. Email security concerns to: [security@iiq-community.org]
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Any suggested fixes (optional)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Initial Assessment**: Within 7 days, we'll provide an initial assessment
- **Resolution Timeline**: We aim to resolve critical issues within 30 days
- **Updates**: We'll keep you informed of our progress
- **Credit**: We'll credit you (if desired) when the issue is resolved

## Security Best Practices

When using MCP IncidentIQ in your K-12 district:

### API Keys and Credentials

- **Never commit API keys** to version control
- Use environment variables for sensitive configuration
- Rotate API keys regularly per district policy
- Use the principle of least privilege for API access
- Ensure API keys are tied to service accounts, not personal accounts
- Follow your district's security policies for credential management

### Environment Configuration

```bash
# Good - Use environment variables
IIQ_API_KEY=your-key-here

# Bad - Never hardcode credentials
const apiKey = "hardcoded-key"; // NEVER DO THIS
```

### Secure Deployment

1. **Use HTTPS** for all API communications
2. **Validate inputs** to prevent injection attacks
3. **Keep dependencies updated** - run `yarn audit` regularly
4. **Use secure headers** in production deployments
5. **Implement rate limiting** to prevent abuse

### Dependency Management

```bash
# Check for vulnerabilities
yarn audit

# Fix vulnerabilities
yarn audit fix

# Update dependencies
yarn upgrade-interactive
```

## Security Checklist

Before deploying to production:

- [ ] All API keys are in environment variables
- [ ] No sensitive data in logs
- [ ] Dependencies are up to date
- [ ] Security audit passed (`yarn audit`)
- [ ] Input validation implemented
- [ ] Error messages don't expose sensitive information
- [ ] Rate limiting configured
- [ ] HTTPS enforced
- [ ] Access controls implemented
- [ ] Audit logging enabled

## Known Security Considerations

### MCP Protocol

- The MCP server runs with the permissions of the user
- Ensure proper access controls on the server host
- Validate all tool inputs before processing

### IncidentIQ API

- API keys have full access to your district's IncidentIQ instance
- Implement proper access controls in your deployment
- Monitor API usage for anomalies
- Be aware that API access includes student and staff data
- Follow district data governance policies

## Security Updates

Stay informed about security updates:

1. Watch this repository for security advisories
2. Enable GitHub security alerts
3. Subscribe to release notifications
4. Review the CHANGELOG for security fixes

## Compliance

This project aims to follow security best practices for K-12 education:

- **FERPA Compliance**: Protect student educational records
- **COPPA Compliance**: Safeguard data for students under 13
- **State Privacy Laws**: Follow your state's student privacy regulations
- **OWASP Top 10**: Awareness of common vulnerabilities
- **District Policies**: Align with local security requirements
- **Regular security reviews**: Continuous improvement
- **Dependency scanning**: Keep libraries up to date

## Contact

For security concerns, contact:
- Security Email: [security@iiq-community.org]
- GitHub Security Advisory: Use private reporting
- Project Maintainers: See [CONTRIBUTING.md](CONTRIBUTING.md)

Thank you for helping keep MCP IncidentIQ secure!
# Security Notes

## Known Vulnerabilities (as of current date)

### esbuild/Vite Development Server Vulnerability
- **Severity**: Moderate
- **Affected**: Development server only (not production builds)
- **Issue**: esbuild allows websites to send requests to dev server
- **Fix Required**: Upgrade to Vite 7.x (requires Node.js 20.19+)
- **Current Blocker**: Project uses Node.js 18.19.1

### Mitigation Strategy
- Vulnerability only affects development environment
- Production builds are not affected
- Plan Node.js upgrade to 20.x LTS in next development cycle
- Monitor for critical security updates

### Action Items
- [ ] Upgrade Node.js to 20.x LTS
- [ ] Run `npm audit fix --force` after Node.js upgrade
- [ ] Test application thoroughly after upgrade
- [ ] Remove this file after vulnerabilities are resolved
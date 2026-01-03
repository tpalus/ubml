# Security Policy

> **Maintained by [NETWORG](https://networg.com)** — This project is actively developed and supported.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in the UBML Schema, please report it by emailing hello@networg.com.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes

We will respond within 48 hours and work with you to understand and address the issue.

## Security Considerations

The UBML Schema itself does not execute code. However, tools that process UBML files should:

1. Validate input against the schema before processing
2. Sanitize any user-provided content before rendering
3. Be cautious with expression evaluation features
4. Follow secure YAML parsing practices (avoid unsafe loaders)

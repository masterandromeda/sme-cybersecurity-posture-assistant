# Contributing to Neural Protocol

Thank you for your interest in contributing! 🛡️

## Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/sme-cybersecurity-posture-assistant.git`
3. **Create a branch**: `git checkout -b feature/your-feature-name`
4. **Make your changes** following the guidelines below
5. **Test** everything works
6. **Commit** with a [conventional commit](https://www.conventionalcommits.org/) message
7. **Push** and open a Pull Request

## Development Setup

See the [Quick Start](README.md#quick-start) section in the README.

## Code Guidelines

### Frontend (TypeScript / Next.js)
- Use TypeScript strictly — no `any` unless unavoidable
- Follow existing component patterns (functional components, hooks)
- Keep components small and focused
- Use Tailwind classes — no inline styles except for dynamic values
- Run `npx tsc --noEmit` before committing

### Backend (Python / FastAPI)
- Follow the existing `_map_*` helper pattern for ORM → Pydantic conversion
- Always use `async`/`await` — no blocking I/O on the main thread
- Add type hints to all function signatures
- Never expose API keys or secrets in responses

## Commit Message Format

```
type(scope): short description

feat     - new feature
fix      - bug fix
docs     - documentation only
style    - formatting, no logic change
refactor - code refactor, no feature/fix
test     - adding tests
chore    - build, deps, config
```

Examples:
```
feat(dashboard): add real-time score animation
fix(backend): handle SMTP timeout gracefully
docs: update API reference table
```

## Pull Request Checklist

- [ ] `npx tsc --noEmit` passes (no TypeScript errors)
- [ ] `npx next build` completes without errors
- [ ] No hardcoded secrets or API keys
- [ ] No `.env` files committed
- [ ] PR description explains what changed and why

## Reporting Bugs

Open an issue with:
- Steps to reproduce
- Expected vs actual behaviour
- OS, Node.js version, Python version

## Security Vulnerabilities

**Do not open a public issue for security vulnerabilities.**
Email: dubeykumar878@gmail.com with subject `Security Disclosure`.

## Questions

Open a [GitHub Discussion](https://github.com/masterandromeda/sme-cybersecurity-posture-assistant/discussions) or email dubeykumar878@gmail.com.

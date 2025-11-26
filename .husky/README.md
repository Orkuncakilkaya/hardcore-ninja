# Husky Git Hooks

This directory contains Git hooks managed by [Husky](https://typicode.github.io/husky/).

## Pre-commit Hook

The pre-commit hook runs `lint-staged` to automatically fix linting issues in staged files before they are committed. This ensures that all committed code follows the project's linting standards.

### How it works

1. When you run `git commit`, the pre-commit hook is triggered
2. The hook runs `npx lint-staged`
3. `lint-staged` runs `pnpm lint:fix` on all staged JavaScript and TypeScript files
4. If the linting process fixes any issues, the changes are automatically added to the commit
5. If there are any issues that cannot be automatically fixed, the commit will fail with an error message

### Configuration

The `lint-staged` configuration is defined in `package.json`:

```json
"lint-staged": {
  "*.{js,jsx,ts,tsx}": [
    "pnpm lint:fix"
  ]
}
```

## Skipping Hooks

In rare cases, you may need to bypass the pre-commit hook. You can do this by adding the `--no-verify` flag to your commit command:

```bash
git commit --no-verify -m "Your commit message"
```

**Note:** This should be used sparingly, as it bypasses the quality checks that the hooks provide.
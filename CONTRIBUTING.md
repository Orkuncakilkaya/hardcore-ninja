# Contributing to Hardcore Ninja

Thank you for your interest in contributing to Hardcore Ninja! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Working with the Multiplayer Game](#working-with-the-multiplayer-game)

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We aim to foster an inclusive and welcoming community.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/hardcore-ninja.git
   cd hardcore-ninja
   ```
3. Add the original repository as a remote to keep your fork in sync:
   ```bash
   git remote add upstream https://github.com/Orkuncakilkaya/hardcore-ninja.git
   ```
4. Install dependencies:
   ```bash
   pnpm install
   ```
5. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

1. Make your changes in your feature branch
2. Run linting and formatting:
   ```bash
   pnpm lint
   pnpm format
   ```

   > **Note:** The project has a pre-commit hook that automatically runs `pnpm lint:fix` on staged files when you commit. This helps ensure that your code follows our linting standards.

3. Test your changes locally:
   ```bash
   pnpm dev
   ```
4. Commit your changes using conventional commit messages:
   ```bash
   pnpm commit
   ```
   This will guide you through creating a standardized commit message.

5. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

## Pull Request Process

1. Create a pull request from your fork to the main repository
2. Fill out the PR template with all required information
3. Request a review from the appropriate code owners
4. Address any feedback from reviewers
5. Once approved, your PR will be merged

### Getting Faster Reviews

- Keep PRs small and focused on a single issue or feature
- Provide clear descriptions of what changed and why
- Include screenshots or videos for UI changes
- Make sure all checks pass before requesting a review
- Respond promptly to review comments

## Coding Standards

We use ESLint and Prettier to enforce coding standards:

- TypeScript for type safety
- React functional components with hooks
- Follow the existing code style and architecture
- Write meaningful comments for complex logic
- Use descriptive variable and function names

## Testing

Currently, we rely on manual testing. When contributing:

1. Test your changes thoroughly in different scenarios
2. Verify that existing functionality still works
3. Check for any performance issues
4. Test on different browsers if making UI changes

## Working with the Multiplayer Game

Hardcore Ninja is a multiplayer game with real-time networking. When making changes:

### Understanding the Architecture

- **Client-Server Model**: The game uses a peer-to-peer model where one player acts as the host (server)
- **Network Synchronization**: Game state is synchronized between clients at regular intervals
- **Prediction and Reconciliation**: Client-side prediction is used for smooth gameplay

### Testing Multiplayer Features

1. Run multiple instances of the game locally:
   - Start the game in one browser window
   - Open another browser window in incognito mode or a different browser
   - Host a game in one window and join from the other

2. Watch for these common issues:
   - Desynchronization between clients
   - Latency problems
   - Race conditions
   - Memory leaks from event listeners

### Performance Considerations

- Minimize network traffic by only sending essential data
- Optimize rendering for smooth gameplay
- Be careful with physics calculations that might diverge between clients
- Profile your code to identify bottlenecks

## Questions?

If you have any questions or need help, please open an issue or contact the maintainers directly.

Thank you for contributing to Hardcore Ninja!

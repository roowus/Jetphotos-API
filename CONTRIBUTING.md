# Contributing to JetPhotos API

First off, thank you for considering contributing to JetPhotos API! 🎉

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the behavior
- **Expected behavior** vs **actual behavior**
- **Code samples** or **error messages** if applicable
- **Environment details** (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are welcome! Please include:

- **Clear use case** - Why is this enhancement useful?
- **Detailed description** of the proposed functionality
- **Examples** of how it would work
- **Alternatives** you've considered

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Make your changes**
   - Follow the existing code style
   - Add comments for complex logic
   - Test your changes thoroughly
3. **Update documentation** if needed
4. **Write clear commit messages**
   - Use present tense ("Add feature" not "Added feature")
   - Be descriptive but concise
5. **Submit the pull request**
   - Reference any related issues
   - Describe what your PR does and why

## Development Setup

1. Clone the repository
   ```bash
   git clone https://github.com/roowus/Jetphotos-API.git
   cd Jetphotos-API
   ```

2. Install Wrangler CLI
   ```bash
   npm install -g wrangler
   ```

3. Login to Cloudflare
   ```bash
   wrangler login
   ```

4. Test locally
   ```bash
   wrangler dev
   ```

## Code Style

- Use consistent indentation (2 spaces)
- Follow JavaScript best practices
- Keep functions focused and small
- Add comments for complex logic
- Use meaningful variable names

## Testing

Before submitting a PR:

1. Test your changes locally using `wrangler dev`
2. Test with various query parameters
3. Verify error handling works correctly
4. Check that existing functionality still works

## Questions?

Feel free to open an issue for questions or start a discussion!

---

Thank you for contributing! 🚀

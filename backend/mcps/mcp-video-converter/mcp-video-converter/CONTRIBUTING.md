# Contributing to MCP Video Converter

Thank you for considering contributing to MCP Video Converter! This document provides guidelines and instructions for contributing to this project.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a new branch for your changes

## Development Environment Setup

1. Create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. Install development dependencies:
   ```bash
   pip install -e .
   pip install pytest pytest-asyncio
   ```

3. Make sure FFmpeg is installed and available in your PATH

## Making Changes

1. Create a new branch from main:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes
3. Write or update tests as needed
4. Run tests locally:
   ```bash
   pytest
   ```

5. Follow the Python code style conventions (PEP 8)

## Submitting Changes

1. Commit your changes with a clear, descriptive commit message
2. Push your branch to your fork
3. Create a pull request to the main branch of the original repository
4. Describe your changes in the pull request and reference any related issues

## Pull Request Process

1. Ensure your code passes all tests
2. Update documentation if necessary
3. The pull request will be reviewed by maintainers
4. Address any feedback or requested changes
5. Once approved, your pull request will be merged

## Code Style

- Follow PEP 8 style guide for Python code
- Use type annotations where applicable
- Write docstrings for all functions, classes, and modules
- Keep lines under 100 characters when possible

## Testing

- Write tests for all new features and bug fixes
- Make sure existing tests pass
- Test with different Python versions if possible

## License

By contributing to MCP Video Converter, you agree that your contributions will be licensed under the project's MIT License.

## Questions

If you have any questions about contributing, please open an issue in the GitHub repository.
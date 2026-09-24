ESSO Smart Home - Claude/Anthropic AI

1. Create an Anthropic API key.
2. Put it in the project root .env file: ANTHROPIC_API_KEY=...
   Or open setup-claude.php and save it to protected local storage.
3. Set ANTHROPIC_MODEL=claude-sonnet-4-6.
4. Restart Apache.
5. Open api/health.php and confirm anthropic_configured=true.
6. Use a clear JPG/PNG first; PDF is also supported by Claude's Messages API.

The key is server-side only. Never place it in HTML, JavaScript, or send it to the browser.

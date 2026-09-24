# ESSO deployment

1. Copy `.env.example` to `.env` on the PHP server.
2. Set `GEMINI_API_KEY` and a strong `ADMIN_KEY`.
3. Keep `.env`, uploads and logs private.
4. Use HTTPS in production.
5. Test `api/health.php`, upload and analysis before opening the configurator.

AI instructions are stored in `config/AI_PROMPT.txt` so they can be edited as a project file without adding a prompt editor to the customer-facing UI.

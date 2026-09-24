ESSO Gemini V24
- Default model changed to Gemini 3.6 Flash.
- Runtime model discovery uses Google models.list and prefers lower-demand stable Flash models.
- High-demand/5xx/429 failures automatically continue to the next supported model.
- gemini-test.php now tests fallback models.
- No API key is included.

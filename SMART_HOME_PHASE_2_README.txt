ESSO Smart Home Phase 2 - Claude/Anthropic Floor Plan Analyzer

Use a server-side ANTHROPIC_API_KEY in .env. Do not put the key in HTML or JavaScript.

Required .env values:
ANTHROPIC_API_KEY=your_anthropic_api_key
GEMINI_MODEL=anthropic-2.5-flash
GEMINI_TIMEOUT=120

Supported visual inputs:
- JPG / JPEG / PNG
- PDF

DXF/DWG are stored for project records, but direct CAD geometry extraction is not enabled.
Export CAD drawings to PDF/PNG/JPG for visual analysis.

Important provider routing fix in V6:
- Claude/Anthropic is selected before media preparation.
- Claude/Anthropic receives PDFs directly as application/pdf inline_data.
- Claude/Anthropic is never contacted when ANTHROPIC_API_KEY is configured.
- If Claude/Anthropic returns an API error, the exact provider message is surfaced in the AI status.

BOQ rules remain server-side and are generated from detected room types; AI does not choose quantities.


V7 note: Claude/Anthropic structured-output schema is normalized for compatibility with the current Claude/Anthropic v1beta endpoint; object additionalProperties is removed before request.

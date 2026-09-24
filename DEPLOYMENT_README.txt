ESSO — COMPLETE WEBSITE PACKAGE

This package preserves the existing project files and product catalog, then applies the Smart Home workflow and fixes broken navigation/asset references.

Run model:
- Public site remains HTML.
- PHP is used only for forms/API/project storage, so it requires PHP hosting even though pages are .html.
- Smart Home uses: upload -> AI analysis -> ESSO rules -> digital model -> protected preview -> conversion request -> engineering status -> final deliverable placeholders.

Required server setup:
1. Copy .env.example to .env.
2. Set ANTHROPIC_API_KEY.
3. Set a long random ADMIN_KEY.
4. Ensure PHP can write uploads/private, uploads/rate, storage/projects and logs.
5. Required PHP extensions: curl, fileinfo, json, mbstring.

Admin:
- Open admin.html.
- Enter ADMIN_KEY.

Important:
- The preview is a protected browser rendering of the digital model; it does not expose original source CAD/3D files.
- DWG/DXF are stored but remain engineering/CAD review inputs.
- BOQ prices are not invented; they remain TBD until you connect real catalog pricing.
- Final engineering design and quotation remain human-reviewed deliverables.


V7 note: Claude/Anthropic structured-output schema is normalized for compatibility with the current Claude/Anthropic v1beta endpoint; object additionalProperties is removed before request.


AI PROMPT CONFIGURATION
Edit config/AI_PROMPT.txt to change the server-side Gemini floor-plan analysis prompt. Do not put secrets in this file.

# ESSO Website

ESSO — Engineering Smart Solutions Office.

This repository contains the ESSO website and Smart Home AI Configurator source.

## Stack
- HTML / CSS / Vanilla JavaScript
- PHP 8.2+
- Gemini server-side AI integration
- File-based project/runtime storage

## Smart Home flow
Requirements → floor-plan upload → AI room identification → preliminary BOQ and room-by-room device distribution → final design request.

The BOQ result remains a clear quantity report and is kept separate from the optional interactive floorplan experience.

## Interactive floorplan demo
- `floorplan.html` and `floorplan_en.html` provide a bilingual interactive 3D dashboard prototype.
- The sample apartment is built in Three.js and uses simulated device states for lights, HVAC, curtains, motion and the alarm.
- This prototype is not connected to a live Home Assistant instance. A production connection must use a server-side proxy and protected credentials; never expose a Home Assistant long-lived access token in browser JavaScript.
- Replace the sample room geometry with a customer-specific model after receiving the actual floor plan or a SketchUp/GLB asset.

## Security
Never commit a real `.env` or API key. Configure secrets on the PHP server using `.env.example`.

## Local use
Run through Apache/PHP (for example XAMPP), not by opening HTML with `file://`.

Example: `http://localhost/ESSO-Website/`

## GitHub Pages
GitHub Pages cannot execute PHP. The AI/upload/project API requires a PHP-capable server.

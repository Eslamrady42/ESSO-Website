# ESSO Website

ESSO — Engineering Smart Solutions Office.

This repository contains the ESSO website and Smart Home AI Configurator source.

## Stack
- HTML / CSS / Vanilla JavaScript
- PHP 8.2+
- Gemini server-side AI integration
- File-based project/runtime storage

## Smart Home flow
Requirements → floor-plan upload → AI analysis → preliminary BOQ → digital project viewer → final design request.

## Security
Never commit a real `.env` or API key. Configure secrets on the PHP server using `.env.example`.

## Local use
Run through Apache/PHP (for example XAMPP), not by opening HTML with `file://`.

Example: `http://localhost/ESSO-Website/`

## GitHub Pages
GitHub Pages cannot execute PHP. The AI/upload/project API requires a PHP-capable server.

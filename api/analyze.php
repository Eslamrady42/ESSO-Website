<?php
declare(strict_types=1);
require_once __DIR__.'/functions.php';
require_once __DIR__.'/csrf.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail_json('Method not allowed.', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    fail_json('Invalid request.');
}
if (!csrf_valid($input['csrf_token'] ?? null)) {
    fail_json('Invalid security token.', 403);
}
if (!rate_limit('analyze:'.client_ip(), RATE_LIMIT_ANALYZE_MAX, RATE_LIMIT_ANALYZE_PERIOD)) {
    fail_json('Too many analysis requests. Please try again later.', 429);
}

$files = clean_array($input['files'] ?? [], 10);
$requirements = clean_array($input['requirements'] ?? [], 30);
$project = is_array($input['project'] ?? null) ? $input['project'] : [];
$manualNotes = [];
$visualFiles = [];

/*
 * Provider selection happens BEFORE media preparation.
 * This is important: a PDF must never be routed through OpenAI's /files
 * endpoint when Gemini is the selected provider. Gemini accepts PDF bytes
 * directly as inline_data.
 */
$aiProvider = gemini_configured() ? 'gemini' : 'none';
$providerModel = $aiProvider === 'gemini' ? GEMINI_MODEL : ($aiProvider === 'openai' ? OPENAI_MODEL : '');

foreach ($files as $id) {
    $path = resolve_private_upload($id);
    if (!$path) {
        $manualNotes[] = 'One uploaded file could not be resolved securely.';
        continue;
    }

    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    if (in_array($ext, ['dxf', 'dwg'], true)) {
        $manualNotes[] = strtoupper($ext).' is uploaded. Direct CAD geometry extraction is not enabled in this build; upload a rendered PDF/PNG/JPG export for visual AI analysis.';
        continue;
    }

    if (!in_array($ext, ['jpg','jpeg','png','pdf'], true)) {
        $manualNotes[] = 'Unsupported visual file type was ignored.';
        continue;
    }

    $data = @file_get_contents($path);
    if ($data === false) {
        $manualNotes[] = 'A visual file could not be read from private storage.';
        continue;
    }

    $mime = function_exists('mime_content_type') ? (mime_content_type($path) ?: '') : '';
    if ($mime === '') {
        $mime = $ext === 'pdf' ? 'application/pdf' : ($ext === 'png' ? 'image/png' : 'image/jpeg');
    }

    if ($aiProvider === 'gemini') {
        $visualFiles[] = [
            'path' => $path,
            'ext' => $ext,
            'mime' => $mime,
            'data' => $data,
        ];
    } elseif ($aiProvider === 'openai') {
        if (in_array($ext, ['jpg','jpeg','png'], true)) {
            $visualFiles[] = [
                'path' => $path,
                'ext' => $ext,
                'mime' => $mime,
                'data' => $data,
            ];
        } elseif ($ext === 'pdf') {
            /* OpenAI file upload is used only when OpenAI is actually selected. */
            $ch = curl_init('https://api.openai.com/v1/files');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => ['Authorization: Bearer '.OPENAI_API_KEY],
                CURLOPT_POSTFIELDS => [
                    'purpose' => 'user_data',
                    'file' => new CURLFile($path, 'application/pdf', basename($path)),
                ],
                CURLOPT_TIMEOUT => OPENAI_TIMEOUT,
            ]);
            $resp = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            $j = json_decode((string)$resp, true);
            if ($code >= 200 && $code < 300 && !empty($j['id'])) {
                $visualFiles[] = [
                    'openai_file_id' => $j['id'],
                    'ext' => 'pdf',
                    'mime' => 'application/pdf',
                ];
            } else {
                $manualNotes[] = 'PDF could not be sent to the OpenAI AI service.'.($error !== '' ? ' '.$error : '');
            }
        }
    }
}

$validVisualFiles = count($visualFiles);

if (!$visualFiles) {
    $fallback = [
        'project' => [
            'total_area_sqm' => is_numeric($project['area'] ?? null) ? (float)$project['area'] : null,
            'floors_count' => is_numeric($project['floors'] ?? null) && (int)$project['floors'] > 0 ? (int)$project['floors'] : 1,
        ],
        'floors' => [],
        'analysis_notes' => array_values(array_unique(array_merge([
            $aiProvider === 'none' ? 'No AI provider is configured. Add GEMINI_API_KEY to .env to use the Gemini analyzer.' : 'No visually analyzable floor-plan file was available to the selected AI provider.',
            'Upload a clear JPG/PNG/PDF floor plan for room detection and geometry reconstruction.',
        ], $manualNotes))),
        'needs_review' => ['Full floor-plan verification required before issuing construction drawings.'],
    ];

    $recommendations = build_recommendations($fallback, $requirements);
    json_response([
        'success' => true,
        'analysis' => $fallback,
        'recommendations' => $recommendations,
        'boq' => build_boq($recommendations),
        'review_required' => $fallback['needs_review'],
        'ai' => [
            'status' => 'not_run',
            'visual_files' => 0,
            'provider' => $aiProvider,
            'model' => $providerModel,
            'message' => implode(' ', array_filter($manualNotes)),
        ],
    ]);
}

$requestedArea = is_numeric($project['area'] ?? null) ? (float)$project['area'] : null;
$requestedFloors = is_numeric($project['floors'] ?? null) ? (int)$project['floors'] : null;

$schema = [
    'type' => 'object',
    'additionalProperties' => false,
    'properties' => [
        'project' => [
            'type' => 'object', 'additionalProperties' => false,
            'properties' => [
                'total_area_sqm' => ['anyOf'=>[['type'=>'number'],['type'=>'null']]],
                'floors_count' => ['type'=>'integer'],
                'orientation' => ['type'=>'string'],
                'confidence' => ['type'=>'number'],
            ],
            'required' => ['total_area_sqm','floors_count','orientation','confidence'],
        ],
        'floors' => [
            'type'=>'array', 'items'=>[
                'type'=>'object','additionalProperties'=>false,
                'properties'=>[
                    'floor_number'=>['type'=>'integer'],
                    'width_m'=>['anyOf'=>[['type'=>'number'],['type'=>'null']]],
                    'depth_m'=>['anyOf'=>[['type'=>'number'],['type'=>'null']]],
                    'envelope'=>[
                        'type'=>'object','additionalProperties'=>false,
                        'properties'=>[
                            'points'=>['type'=>'array','items'=>['type'=>'object','additionalProperties'=>false,'properties'=>['x'=>['type'=>'number'],'y'=>['type'=>'number']],'required'=>['x','y']]],
                            'confidence'=>['type'=>'number'], 'needs_review'=>['type'=>'boolean'],
                        ],
                        'required'=>['points','confidence','needs_review'],
                    ],
                    'walls'=>[
                        'type'=>'array','items'=>[
                            'type'=>'object','additionalProperties'=>false,
                            'properties'=>[
                                'id'=>['type'=>'string'],'type'=>['type'=>'string'],
                                'points'=>['type'=>'array','items'=>['type'=>'object','additionalProperties'=>false,'properties'=>['x'=>['type'=>'number'],'y'=>['type'=>'number']],'required'=>['x','y']]],
                                'thickness_m'=>['anyOf'=>[['type'=>'number'],['type'=>'null']]],
                                'confidence'=>['type'=>'number'],'needs_review'=>['type'=>'boolean'],
                            ],
                            'required'=>['id','type','points','thickness_m','confidence','needs_review'],
                        ],
                    ],
                    'rooms'=>[
                        'type'=>'array','items'=>[
                            'type'=>'object','additionalProperties'=>false,
                            'properties'=>[
                                'name'=>['type'=>'string'],'type'=>['type'=>'string'],
                                'area_sqm'=>['anyOf'=>[['type'=>'number'],['type'=>'null']]],
                                'dimensions'=>[
                                    'type'=>'object','additionalProperties'=>false,
                                    'properties'=>['width'=>['anyOf'=>[['type'=>'number'],['type'=>'null']]],'length'=>['anyOf'=>[['type'=>'number'],['type'=>'null']]]],
                                    'required'=>['width','length'],
                                ],
                                'doors'=>['type'=>'integer'],'windows'=>['type'=>'integer'],
                                'door_details'=>[
                                    'type'=>'array','items'=>[
                                        'type'=>'object','additionalProperties'=>false,
                                        'properties'=>[
                                            'x'=>['type'=>'number'],'y'=>['type'=>'number'],
                                            'width_pct'=>['anyOf'=>[['type'=>'number'],['type'=>'null']]],
                                            'wall'=>['type'=>'string'],'swing'=>['type'=>'string'],'confidence'=>['type'=>'number'],
                                        ],
                                        'required'=>['x','y','width_pct','wall','swing','confidence'],
                                    ],
                                ],
                                'window_details'=>[
                                    'type'=>'array','items'=>[
                                        'type'=>'object','additionalProperties'=>false,
                                        'properties'=>[
                                            'x'=>['type'=>'number'],'y'=>['type'=>'number'],
                                            'width_pct'=>['anyOf'=>[['type'=>'number'],['type'=>'null']]],
                                            'wall'=>['type'=>'string'],'confidence'=>['type'=>'number'],
                                        ],
                                        'required'=>['x','y','width_pct','wall','confidence'],
                                    ],
                                ],
                                'geometry'=>[
                                    'type'=>'object','additionalProperties'=>false,
                                    'properties'=>[
                                        'x'=>['anyOf'=>[['type'=>'number'],['type'=>'null']]],
                                        'y'=>['anyOf'=>[['type'=>'number'],['type'=>'null']]],
                                        'width'=>['anyOf'=>[['type'=>'number'],['type'=>'null']]],
                                        'depth'=>['anyOf'=>[['type'=>'number'],['type'=>'null']]],
                                        'points'=>['type'=>'array','items'=>['type'=>'object','additionalProperties'=>false,'properties'=>['x'=>['type'=>'number'],'y'=>['type'=>'number']],'required'=>['x','y']]],
                                    ],
                                    'required'=>['x','y','width','depth','points'],
                                ],
                                'confidence'=>['type'=>'number'],'status'=>['type'=>'string'],'needs_review'=>['type'=>'boolean'],
                                'evidence'=>[
                                    'type'=>'object','additionalProperties'=>false,
                                    'properties'=>[
                                        'label_detected'=>['type'=>'boolean'],'label_text'=>['type'=>'string'],
                                        'boundary_detected'=>['type'=>'boolean'],'visual_context'=>['type'=>'string'],
                                        'fixtures_detected'=>['type'=>'array','items'=>['type'=>'string']],
                                        'doors_detected'=>['type'=>'integer'],'windows_detected'=>['type'=>'integer'],
                                        'adjacency_evidence'=>['type'=>'array','items'=>['type'=>'string']],
                                    ],
                                    'required'=>['label_detected','label_text','boundary_detected','visual_context','fixtures_detected','doors_detected','windows_detected','adjacency_evidence'],
                                ],
                                'adjacent_rooms'=>['type'=>'array','items'=>['type'=>'string']],
                            ],
                            'required'=>['name','type','area_sqm','dimensions','doors','windows','door_details','window_details','geometry','confidence','status','needs_review','evidence','adjacent_rooms'],
                        ],
                    ],
                    'stairs'=>[
                        'type'=>'array','items'=>[
                            'type'=>'object','additionalProperties'=>false,
                            'properties'=>[
                                'x'=>['anyOf'=>[['type'=>'number'],['type'=>'null']]],
                                'y'=>['anyOf'=>[['type'=>'number'],['type'=>'null']]],
                                'width_pct'=>['anyOf'=>[['type'=>'number'],['type'=>'null']]],
                                'depth_pct'=>['anyOf'=>[['type'=>'number'],['type'=>'null']]],
                                'direction'=>['type'=>'string'],'confidence'=>['type'=>'number'],'needs_review'=>['type'=>'boolean'],
                            ],
                            'required'=>['x','y','width_pct','depth_pct','direction','confidence','needs_review'],
                        ],
                    ],
                ],
                'required'=>['floor_number','width_m','depth_m','envelope','walls','rooms','stairs'],
            ],
        ],
        'analysis_notes'=>['type'=>'array','items'=>['type'=>'string']],
        'needs_review'=>['type'=>'array','items'=>['type'=>'string']],
    ],
    'required'=>['project','floors','analysis_notes','needs_review'],
];

/*
 * Gemini's currently-served v1beta endpoint can reject some JSON Schema
 * keywords even when newer documentation lists them as supported. Keep the
 * schema portable by stripping unsupported object keywords before sending it.
 */
function gemini_compatible_schema(array $schema): array
{
    /*
     * The current generateContent REST API supports `responseJsonSchema` as
     * a JSON-Schema value. Use JSON-Schema types (string/number/integer/
     * boolean/object/array) here instead of the protobuf enum-shaped
     * `responseSchema`. This avoids enum/proto coercion errors in v1beta.
     */
    $allowed = [
        'type', 'format', 'title', 'description', 'enum', 'items',
        'prefixItems', 'minItems', 'maxItems', 'minimum', 'maximum',
        'anyOf', 'oneOf', 'properties', 'additionalProperties', 'required',
    ];

    $out = [];
    foreach ($schema as $key => $value) {
        if (!in_array($key, $allowed, true)) {
            continue;
        }
        if ($key === 'type' && is_array($value)) {
            $out[$key] = $value;
        } elseif ($key === 'properties' && is_array($value)) {
            $props = [];
            foreach ($value as $name => $child) {
                $props[$name] = is_array($child) ? gemini_compatible_schema($child) : $child;
            }
            $out[$key] = $props;
        } elseif ($key === 'items' && is_array($value)) {
            $out[$key] = gemini_compatible_schema($value);
        } elseif (in_array($key, ['anyOf', 'oneOf', 'prefixItems'], true) && is_array($value)) {
            $out[$key] = array_map(
                static fn($item) => is_array($item) ? gemini_compatible_schema($item) : $item,
                $value
            );
        } else {
            $out[$key] = $value;
        }
    }

    return $out;
}

$geminiSchema = gemini_compatible_schema($schema);

$promptFile = dirname(__DIR__).'/config/AI_PROMPT.txt';
if (!is_file($promptFile) || !is_readable($promptFile)) {
    fail_json('AI prompt configuration is missing or unreadable on the server.', 500);
}
$instructions = trim((string)file_get_contents($promptFile));
if ($instructions === '') {
    fail_json('AI prompt configuration is empty. Edit config/AI_PROMPT.txt.', 500);
}



$json_shape = <<<'JSON_SHAPE'
{
  "project": {"total_area_sqm": null, "floors_count": 1},
  "floors": [{
    "floor_number": 1,
    "width_m": null,
    "depth_m": null,
    "rooms": [{
      "name": "Reception",
      "type": "reception",
      "area_sqm": null,
      "dimensions": {"width": null, "length": null},
      "doors": 0,
      "windows": 0,
      "geometry": {"x": null, "y": null, "width": null, "depth": null, "points": []},
      "confidence": 0,
      "status": "unknown",
      "needs_review": true
    }]
  }],
  "analysis_notes": [],
  "needs_review": []
}
JSON_SHAPE;

if ($aiProvider === 'none') {
    $fallback = [
        'project' => [
            'total_area_sqm' => $requestedArea,
            'floors_count' => $requestedFloors && $requestedFloors > 0 ? $requestedFloors : 1,
        ],
        'floors' => [],
        'analysis_notes' => array_values(array_unique(array_merge([
            'No AI provider is configured. Add GEMINI_API_KEY to .env to use the free Gemini analyzer.',
            'OpenAI remains supported as an optional fallback when OPENAI_API_KEY is configured.',
            'Upload a clear JPG/PNG/PDF floor plan for room detection and geometry reconstruction.',
        ], $manualNotes))),
        'needs_review' => ['AI analysis unavailable; configure an AI provider and retry.'],
    ];
    $recommendations = build_recommendations($fallback, $requirements);
    json_response([
        'success' => true,
        'analysis' => $fallback,
        'recommendations' => $recommendations,
        'boq' => build_boq($recommendations),
        'review_required' => $fallback['needs_review'],
        'ai' => [
            'status' => 'not_run',
            'provider' => 'none',
            'visual_files' => $validVisualFiles,
            'model' => '',
        ],
    ]);
}

$text = '';
$response = false;
$curlError = '';
$httpCode = 0;
$providerModel = '';
$serverMessage = '';

if ($aiProvider === 'gemini') {
    $configuredModels = array_values(array_unique(array_filter(array_merge(
        [GEMINI_MODEL],
        array_map('trim', explode(',', GEMINI_FALLBACK_MODELS))
    ))));

    // For multimodal floor-plan work, prefer stable Flash models with lower
    // current demand before trying the most heavily requested model. If the
    // API exposes a model list, merge only models capable of generateContent.
    $modelsToTry = $configuredModels;
    $listUrl = 'https://generativelanguage.googleapis.com/v1beta/models?key='.rawurlencode(gemini_api_key()).'&pageSize=1000';
    $listCh = @curl_init($listUrl);
    if ($listCh !== false) {
        curl_setopt_array($listCh, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>20, CURLOPT_HTTPHEADER=>['Accept: application/json']]);
        $listBody = curl_exec($listCh);
        $listCode = (int)curl_getinfo($listCh, CURLINFO_HTTP_CODE);
        curl_close($listCh);
        $listed = json_decode((string)$listBody, true);
        if ($listCode >= 200 && $listCode < 300 && is_array($listed['models'] ?? null)) {
            $available = [];
            foreach ($listed['models'] as $m) {
                $name = (string)($m['name'] ?? '');
                $methods = (array)($m['supportedGenerationMethods'] ?? []);
                if ($name !== '' && in_array('generateContent', $methods, true)) {
                    $short = preg_replace('/^models\//', '', $name);
                    if (is_string($short) && preg_match('/^gemini-/i', $short)) {
                        $available[] = $short;
                    }
                }
            }
            $preferred = [];
            foreach (['gemini-3.6-flash','gemini-3.5-flash-lite','gemini-3.7-flash','gemini-3.5-flash','gemini-3.8-flash'] as $preferredName) {
                if (in_array($preferredName, $available, true)) $preferred[] = $preferredName;
            }
            $modelsToTry = array_values(array_unique(array_merge($preferred, $configuredModels)));
        }
    }

    $userPrompt = $instructions . "\n\nReturn ONLY one JSON object matching this shape. The example values are placeholders; replace them with values supported by the drawing.\n" . $json_shape;
    $lastGeminiMessage = '';
    $lastGeminiCode = 0;

    foreach ($modelsToTry as $candidateModel) {
        $providerModel = $candidateModel;
        $partsForGemini = [['text' => $userPrompt]];
        foreach ($visualFiles as $vf) {
            if (!empty($vf['data'])) {
                $partsForGemini[] = [
                    'inline_data' => [
                        'mime_type' => $vf['mime'],
                        'data' => base64_encode($vf['data']),
                    ],
                ];
            }
        }

        $geminiPayload = [
            'systemInstruction' => [
                'parts' => [[
                    'text' => 'You are the ESSO floor-plan analysis engine. Analyze every attached plan visually. Return only valid JSON; no Markdown, no explanations outside the JSON.'
                ]]
            ],
            'contents' => [[
                'role' => 'user',
                'parts' => $partsForGemini,
            ]],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
                // Deep reasoning + a larger output budget are intentional for architectural reconstruction.
                'responseJsonSchema' => $geminiSchema,
                'temperature' => 0,
                'maxOutputTokens' => 32768,
                'thinkingConfig' => [
                    'thinkingLevel' => 'high',
                ],
            ],
        ];

        $url = 'https://generativelanguage.googleapis.com/v1beta/models/'.rawurlencode($candidateModel).':generateContent?key='.rawurlencode(gemini_api_key());
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($geminiPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            CURLOPT_TIMEOUT => GEMINI_TIMEOUT,
        ]);
        $candidateResponse = curl_exec($ch);
        $candidateCurlError = curl_error($ch);
        $candidateCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decodedCandidate = json_decode((string)$candidateResponse, true);
        $candidateMessage = is_array($decodedCandidate)
            ? clean_string($decodedCandidate['error']['message'] ?? '', 500)
            : '';
        $candidateText = '';
        if (is_array($decodedCandidate)) {
            foreach (($decodedCandidate['candidates'][0]['content']['parts'] ?? []) as $part) {
                if (is_string($part['text'] ?? null)) {
                    $candidateText .= $part['text'];
                }
            }
        }

        $lastGeminiMessage = $candidateMessage !== '' ? $candidateMessage : $candidateCurlError;
        $lastGeminiCode = $candidateCode;

        if ($candidateResponse !== false && $candidateCode >= 200 && $candidateCode < 300 && trim($candidateText) !== '') {
            $response = $candidateResponse;
            $curlError = '';
            $httpCode = $candidateCode;
            $serverMessage = '';
            $text = trim($candidateText);
            break;
        }

        // Try the next model when the configured model is unavailable, unsupported, rate-limited, or rejected.
        if (!in_array($candidateCode, [400, 401, 403, 404, 408, 409, 425, 429, 500, 502, 503, 504], true)) {
            break;
        }
        if (in_array($candidateCode, [429, 500, 502, 503, 504], true)) { usleep(450000); }
    }

    if (trim($text) === '') {
        $response = false;
        $httpCode = $lastGeminiCode;
        $serverMessage = $lastGeminiMessage;
    }
} else {
    $providerModel = OPENAI_MODEL;
    $content = [['type' => 'input_text', 'text' => $instructions]];
    foreach ($visualFiles as $vf) {
        if (!empty($vf['openai_file_id'])) {
            $content[] = ['type' => 'input_file', 'file_id' => $vf['openai_file_id']];
        } elseif (!empty($vf['data'])) {
            $content[] = [
                'type' => 'input_image',
                'detail' => 'high',
                'image_url' => 'data:'.$vf['mime'].';base64,'.base64_encode($vf['data']),
            ];
        }
    }
    $payload = [
        'provider' => $aiProvider,
        'model' => $providerModel,
        'input' => [[
            'role' => 'user',
            'content' => $content,
        ]],
        'text' => [
            'format' => [
                'type' => 'json_schema',
                'name' => 'esso_floor_plan_analysis',
                'strict' => true,
                'schema' => $schema,
            ],
        ],
        'temperature' => 0,
    ];
    $ch = curl_init('https://api.openai.com/v1/responses');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer '.OPENAI_API_KEY,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_TIMEOUT => OPENAI_TIMEOUT,
    ]);
    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $decoded = json_decode((string)$response, true);
    if (is_array($decoded)) {
        $serverMessage = clean_string($decoded['error']['message'] ?? '', 350);
        if (is_string($decoded['output_text'] ?? null)) {
            $text = $decoded['output_text'];
        }
        if ($text === '') {
            foreach (($decoded['output'] ?? []) as $item) {
                foreach (($item['content'] ?? []) as $c) {
                    if (is_string($c['text'] ?? null)) {
                        $text .= $c['text'];
                    }
                }
            }
        }
    }
}

if ($response !== false && $httpCode >= 200 && $httpCode < 300 && trim($text) === '') {
    $analysisMessage = $serverMessage !== '' ? $serverMessage : 'Gemini returned no structured analysis content.';
    audit_log('Gemini analysis empty response HTTP '.$httpCode.' '.$analysisMessage);
    $fallback = [
        'project' => [
            'total_area_sqm' => $requestedArea,
            'floors_count' => $requestedFloors && $requestedFloors > 0 ? $requestedFloors : 1,
        ],
        'floors' => [],
        'analysis_notes' => array_values(array_unique(array_merge([
            'AI service returned no analyzable structured result.',
            'AI service message: '.$analysisMessage,
            'Try a clearer JPG/PNG/PDF floor plan with the whole drawing visible.',
        ], $manualNotes))),
        'needs_review' => ['AI analysis returned no room data; verify the floor plan manually.'],
    ];
    $recommendations = build_recommendations($fallback, $requirements);
    json_response([
        'success' => true,
        'analysis' => $fallback,
        'recommendations' => $recommendations,
        'boq' => build_boq($recommendations),
        'review_required' => $fallback['needs_review'],
        'ai' => [
            'status' => 'error',
            'provider' => $aiProvider,
            'visual_files' => $validVisualFiles,
            'model' => $providerModel,
            'message' => $analysisMessage,
        ],
    ]);
}

if ($response === false || $httpCode < 200 || $httpCode >= 300) {
    audit_log(ucfirst($aiProvider).' analysis failure HTTP '.$httpCode.' '.$serverMessage.' '.substr($curlError, 0, 180));
    $fallback = [
        'project' => [
            'total_area_sqm' => $requestedArea,
            'floors_count' => $requestedFloors && $requestedFloors > 0 ? $requestedFloors : 1,
        ],
        'floors' => [],
        'analysis_notes' => array_values(array_unique(array_merge([
            'AI service could not complete the floor-plan analysis.',
            $serverMessage !== '' ? 'AI service message: '.$serverMessage : '',
            'The engineering team must verify rooms, dimensions, doors and windows manually.',
        ], $manualNotes))),
        'needs_review' => ['AI analysis unavailable; verify all rooms and dimensions before design approval.'],
    ];
    $recommendations = build_recommendations($fallback, $requirements);
    json_response([
        'success' => true,
        'analysis' => $fallback,
        'recommendations' => $recommendations,
        'boq' => build_boq($recommendations),
        'review_required' => $fallback['needs_review'],
        'ai' => [
            'status' => 'error',
            'provider' => $aiProvider,
            'visual_files' => $validVisualFiles,
            'model' => $providerModel,
            'message' => $serverMessage,
        ],
    ]);
}

$cleanText = trim($text);
if (str_starts_with($cleanText, '```')) {
    $cleanText = preg_replace('/^```(?:json)?\s*/i', '', $cleanText);
    $cleanText = preg_replace('/\s*```$/', '', $cleanText);
}
$firstBrace = strpos($cleanText, '{');
$lastBrace = strrpos($cleanText, '}');
$candidateJson = ($firstBrace !== false && $lastBrace !== false && $lastBrace > $firstBrace)
    ? substr($cleanText, $firstBrace, $lastBrace - $firstBrace + 1)
    : $cleanText;
$analysis = json_decode($candidateJson, true);
if (!is_array($analysis)) {
    audit_log(ucfirst($aiProvider).' returned invalid structured analysis.');
    json_response([
        'success' => true,
        'analysis' => [
            'project' => [
                'total_area_sqm' => $requestedArea,
                'floors_count' => $requestedFloors && $requestedFloors > 0 ? $requestedFloors : 1,
            ],
            'floors' => [],
            'analysis_notes' => ['AI returned invalid structured data.', 'The engineering team must verify rooms, dimensions, doors and windows manually.'],
            'needs_review' => ['AI analysis unavailable; retry with a clear plan.'],
        ],
        'recommendations' => [],
        'boq' => [],
        'review_required' => ['AI analysis unavailable; retry with a clear plan.'],
        'ai' => [
            'status' => 'error',
            'provider' => $aiProvider,
            'visual_files' => $validVisualFiles,
            'model' => $providerModel,
            'message' => 'Invalid structured JSON returned by AI.',
        ],
    ]);
}

$analysis = validate_analysis($analysis);

if ($analysis['project']['total_area_sqm'] === null && $requestedArea !== null) {
    $analysis['project']['total_area_sqm'] = $requestedArea;
    $analysis['analysis_notes'][] = 'Project area came from customer input because the drawing did not provide a verified area.';
}
if ($analysis['project']['floors_count'] <= 0 && $requestedFloors !== null && $requestedFloors > 0) {
    $analysis['project']['floors_count'] = $requestedFloors;
}

$analysis['analysis_notes'] = array_values(array_unique(array_merge($analysis['analysis_notes'], $manualNotes)));
if (count($analysis['floors']) === 0) {
    $analysis['needs_review'][] = 'No reliable rooms were detected. Upload a clearer plan or provide an engineering-reviewed drawing.';
}
$analysis['needs_review'] = array_values(array_unique($analysis['needs_review']));

$recommendations = build_recommendations($analysis, $requirements);
json_response([
    'success' => true,
    'analysis' => $analysis,
    'recommendations' => $recommendations,
    'boq' => build_boq($recommendations),
    'review_required' => $analysis['needs_review'],
    'ai' => [
        'status' => 'completed',
        'visual_files' => $validVisualFiles,
        'provider' => $aiProvider,
        'model' => $providerModel,
    ],
]);

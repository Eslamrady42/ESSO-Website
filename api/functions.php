<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';

function e(string $v): string
{
    return htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function valid_email(string $v): bool
{
    return filter_var($v, FILTER_VALIDATE_EMAIL) !== false && !preg_match('/[\r\n]/', $v);
}

function client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function clean_string($v, int $max = 500): string
{
    $v = trim((string)$v);
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

function clean_array($v, int $maxItems = 50): array
{
    if (!is_array($v)) {
        return [];
    }

    $o = [];
    foreach (array_slice($v, 0, $maxItems) as $item) {
        $s = clean_string($item, 100);
        if ($s !== '') {
            $o[] = $s;
        }
    }
    return array_values(array_unique($o));
}

function random_id(): string
{
    return bin2hex(random_bytes(16));
}

function safe_filename(string $name): string
{
    return preg_replace('/[^A-Za-z0-9._-]/', '_', basename($name)) ?: 'file';
}

function resolve_private_upload(string $stored): ?string
{
    if (!preg_match('/^[a-f0-9]{32}\.(jpg|jpeg|png|pdf|dxf|dwg)$/i', $stored)) {
        return null;
    }

    $p = PRIVATE_UPLOAD_PATH.'/'.$stored;
    return is_file($p) ? $p : null;
}

function audit_log(string $message): void
{
    @file_put_contents(
        LOGS_PATH.'/app.log',
        '['.gmdate('c').'] '.$message.PHP_EOL,
        FILE_APPEND | LOCK_EX
    );
}

function rate_limit(string $key, int $max, int $period): bool
{
    $file = RATE_LIMIT_PATH.'/'.hash('sha256', $key).'.json';
    $fp = @fopen($file, 'c+');
    if (!$fp || !flock($fp, LOCK_EX)) {
        if ($fp) {
            fclose($fp);
        }
        return false;
    }

    $data = json_decode(stream_get_contents($fp) ?: '[]', true);
    if (!is_array($data)) {
        $data = [];
    }

    $now = time();
    $data = array_values(array_filter(
        $data,
        static fn($t) => is_int($t) && ($now - $t) < $period
    ));

    if (count($data) >= $max) {
        flock($fp, LOCK_UN);
        fclose($fp);
        return false;
    }

    $data[] = $now;
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return true;
}

function normalize_room_type(string $type, string $name = ''): string
{
    $v = strtolower(trim($type.' '.$name));
    $map = [
        'reception' => ['reception', 'salon', 'majlis', 'living reception', 'صالون', 'ريسبشن', 'استقبال'],
        'living_room' => ['living_room', 'living room', 'lounge', 'living', 'معيشة', 'ليفينج'],
        'master_bedroom' => ['master_bedroom', 'master bedroom', 'master', 'ماستر', 'غرفة نوم رئيسية'],
        'bedroom' => ['bedroom', 'bed room', 'guest room', 'kids room', 'غرفة نوم', 'غرفة الأطفال', 'نوم'],
        'kitchen' => ['kitchen', 'مطبخ'],
        'bathroom' => ['bathroom', 'toilet', 'wc', 'shower', 'حمام', 'دورة مياه'],
        'corridor' => ['corridor', 'hallway', 'hall', 'ممر', 'طرقة'],
        'office' => ['office', 'study', 'workspace', 'مكتب', 'دراسة'],
        'dining' => ['dining', 'dining room', 'سفرة', 'طعام'],
        'laundry' => ['laundry', 'غسيل'],
        'utility' => ['utility', 'service', 'مخزن خدمات', 'خدمات'],
    ];

    foreach ($map as $canonical => $terms) {
        foreach ($terms as $term) {
            if ($term !== '' && strpos($v, strtolower($term)) !== false) {
                return $canonical;
            }
        }
    }

    return 'other';
}

function room_is_habitable(string $type): bool
{
    return in_array(
        normalize_room_type($type),
        ['reception', 'living_room', 'master_bedroom', 'bedroom', 'office', 'dining', 'other'],
        true
    );
}

function esso_http_post_json(string $url, array $payload, array $headers = [], int $timeout = 120): array
{
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return ['ok'=>false,'status'=>0,'body'=>'','error'=>'Failed to encode JSON request: '.json_last_error_msg()];
    }

    $defaultHeaders = [
        'Content-Type: application/json',
        'Accept: application/json',
        'Content-Length: '.strlen($json),
    ];
    $requestHeaders = array_merge($defaultHeaders, $headers);

    // Prefer cURL because it provides reliable HTTPS, status codes and timeouts on XAMPP.
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        if ($ch === false) {
            return ['ok'=>false,'status'=>0,'body'=>'','error'=>'Unable to initialize cURL.'];
        }
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_HTTPHEADER => $requestHeaders,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => false,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => min(20, max(5, $timeout)),
            CURLOPT_TIMEOUT => max(20, $timeout),
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_ENCODING => '',
        ]);
        $body = curl_exec($ch);
        $errno = curl_errno($ch);
        $error = $errno ? curl_error($ch) : '';
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return [
            'ok' => $body !== false && $status >= 200 && $status < 300,
            'status' => $status,
            'body' => $body === false ? '' : (string)$body,
            'error' => $error,
        ];
    }

    // Stream fallback for hosts where cURL is unavailable but allow_url_fopen is enabled.
    if (filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN)) {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $requestHeaders),
                'content' => $json,
                'timeout' => max(20, $timeout),
                'ignore_errors' => true,
            ],
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
                'allow_self_signed' => false,
            ],
        ]);
        $body = @file_get_contents($url, false, $context);
        $status = 0;
        $error = '';
        foreach (($http_response_header ?? []) as $line) {
            if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $line, $m)) {
                $status = (int)$m[1];
                break;
            }
        }
        if ($body === false) {
            $error = 'HTTP stream request failed.';
            $body = '';
        }
        return [
            'ok' => $status >= 200 && $status < 300,
            'status' => $status,
            'body' => (string)$body,
            'error' => $error,
        ];
    }

    return [
        'ok'=>false,
        'status'=>0,
        'body'=>'',
        'error'=>'Neither cURL nor allow_url_fopen is available for outbound HTTPS requests.',
    ];
}

function validate_analysis(array $data): array
{
    $o = [
        'project' => [
            'total_area_sqm' => null,
            'floors_count' => 0,
        ],
        'floors' => [],
        'analysis_notes' => [],
        'needs_review' => [],
    ];

    $p = is_array($data['project'] ?? null) ? $data['project'] : [];
    $a = $p['total_area_sqm'] ?? null;
    $f = $p['floors_count'] ?? null;

    $o['project']['total_area_sqm'] = is_numeric($a) && $a > 0 && $a <= 100000 ? (float)$a : null;
    $o['project']['floors_count'] = is_numeric($f) && $f >= 1 && $f <= 100 ? (int)$f : 0;

    foreach (array_slice(is_array($data['floors'] ?? null) ? $data['floors'] : [], 0, 100) as $fi => $floor) {
        if (!is_array($floor)) {
            continue;
        }

        $no = is_numeric($floor['floor_number'] ?? null)
            ? max(1, min(100, (int)$floor['floor_number']))
            : $fi + 1;

        $floorWidth = is_numeric($floor['width_m'] ?? null) && $floor['width_m'] > 0
            ? min(500, (float)$floor['width_m'])
            : null;
        $floorDepth = is_numeric($floor['depth_m'] ?? null) && $floor['depth_m'] > 0
            ? min(500, (float)$floor['depth_m'])
            : null;

        $rooms = [];
        foreach (array_slice(is_array($floor['rooms'] ?? null) ? $floor['rooms'] : [], 0, 100) as $ri => $room) {
            if (!is_array($room)) {
                continue;
            }

            $name = clean_string($room['name'] ?? 'Unnamed Room', 120);
            $type = normalize_room_type(
                clean_string($room['type'] ?? 'other', 50),
                $name
            );
            $c = is_numeric($room['confidence'] ?? null)
                ? max(0, min(100, (float)$room['confidence']))
                : 0;
            $d = is_array($room['dimensions'] ?? null) ? $room['dimensions'] : [];
            $g = is_array($room['geometry'] ?? null) ? $room['geometry'] : [];

            $width = is_numeric($d['width'] ?? null) && $d['width'] > 0
                ? min(200, (float)$d['width'])
                : null;
            $length = is_numeric($d['length'] ?? null) && $d['length'] > 0
                ? min(200, (float)$d['length'])
                : null;
            $area = is_numeric($room['area_sqm'] ?? null) && $room['area_sqm'] > 0
                ? min(10000, (float)$room['area_sqm'])
                : null;

            $gx = is_numeric($g['x'] ?? null) ? max(0, min(100, (float)$g['x'])) : null;
            $gy = is_numeric($g['y'] ?? null) ? max(0, min(100, (float)$g['y'])) : null;
            $gw = is_numeric($g['width'] ?? null) && $g['width'] > 0 ? min(100, (float)$g['width']) : null;
            $gd = is_numeric($g['depth'] ?? null) && $g['depth'] > 0 ? min(100, (float)$g['depth']) : null;
            $points = [];
            foreach (array_slice(is_array($g['points'] ?? null) ? $g['points'] : [], 0, 24) as $pt) {
                if (!is_array($pt) || !is_numeric($pt['x'] ?? null) || !is_numeric($pt['y'] ?? null)) continue;
                $points[] = [
                    'x' => max(0, min(100, (float)$pt['x'])),
                    'y' => max(0, min(100, (float)$pt['y'])),
                ];
            }
            if (count($points) < 3) $points = [];

            $needs = (bool)($room['needs_review'] ?? ($c < 75));
            $status = $room['status'] ?? null;
            if (!in_array($status, ['detected', 'inferred', 'unknown'], true)) {
                $status = $c >= 75 ? 'detected' : ($c > 0 ? 'inferred' : 'unknown');
            }

            if ($area === null && $width !== null && $length !== null) {
                $area = round($width * $length, 2);
            }
            if ($width === null && $area !== null && $length !== null && $length > 0) {
                $width = round($area / $length, 2);
            }
            if ($length === null && $area !== null && $width !== null && $width > 0) {
                $length = round($area / $width, 2);
            }

            $rooms[] = [
                'name' => $name,
                'type' => $type,
                'area_sqm' => $area,
                'dimensions' => [
                    'width' => $width,
                    'length' => $length,
                ],
                'doors' => max(0, min(100, (int)($room['doors'] ?? 0))),
                'windows' => max(0, min(100, (int)($room['windows'] ?? 0))),
                'geometry' => [
                    'x' => $gx,
                    'y' => $gy,
                    'width' => $gw,
                    'depth' => $gd,
                    'points' => $points,
                ],
                'confidence' => $c,
                'status' => $status,
                'needs_review' => $needs,
            ];
        }

        $o['floors'][] = [
            'floor_number' => $no,
            'width_m' => $floorWidth,
            'depth_m' => $floorDepth,
            'rooms' => $rooms,
        ];
    }

    $o['project']['floors_count'] = $o['project']['floors_count'] ?: count($o['floors']);

    foreach ((array)($data['analysis_notes'] ?? $data['notes'] ?? []) as $n) {
        $n = clean_string($n, 300);
        if ($n !== '') {
            $o['analysis_notes'][] = $n;
        }
    }
    $o['analysis_notes'] = array_values(array_unique($o['analysis_notes']));

    foreach ($o['floors'] as $fl) {
        foreach ($fl['rooms'] as $r) {
            if ($r['needs_review']) {
                $o['needs_review'][] = $r['name'].' requires engineering review.';
            }
            if ($r['area_sqm'] === null) {
                $o['needs_review'][] = $r['name'].' area could not be verified from the plan.';
            }
        }
    }

    $o['needs_review'] = array_values(array_unique($o['needs_review']));
    return $o;
}

function build_recommendations(array $a, array $requirements): array
{
    $req = array_fill_keys($requirements, true);
    $items = [];

    $add = static function (
        array &$items,
        string $room,
        string $cat,
        string $type,
        int $qty,
        string $reason,
        float $confidence,
        string $rule,
        bool $required = true
    ): void {
        if ($qty <= 0) {
            return;
        }
        $items[] = [
            'room' => $room,
            'category' => $cat,
            'type' => $type,
            'qty' => $qty,
            'reason' => $reason,
            'confidence' => $confidence,
            'rule' => $rule,
            'required' => $required ? 'required' : 'recommended',
        ];
    };

    $foundWaterArea = false;
    $foundKitchen = false;

    foreach ($a['floors'] as $fl) {
        foreach ($fl['rooms'] as $r) {
            $n = $r['name'];
            $type = normalize_room_type($r['type'], $n);
            $c = (float)$r['confidence'];
            $switchQty = in_array($type, ['reception', 'master_bedroom'], true) ? 2 : 1;

            // ESSO core lighting rule: every detected room gets a switch;
            // reception and master bedroom get two 4-gang switches.
            $add(
                $items,
                $n,
                'Lighting',
                'Zigbee 4-gang lighting switch',
                $switchQty,
                in_array($type, ['reception', 'master_bedroom'], true)
                    ? 'ESSO rule: reception/master bedroom = 2 switches'
                    : 'ESSO rule: 1 lighting switch per room',
                $c,
                in_array($type, ['reception', 'master_bedroom'], true)
                    ? 'zigbee-4gang-reception-master'
                    : 'zigbee-4gang-per-room',
                true
            );

            // IR and smoke are applied to habitable rooms; service/wet rooms are excluded.
            if (room_is_habitable($type)) {
                $add(
                    $items,
                    $n,
                    'Comfort',
                    'IR HVAC/Remote control',
                    1,
                    'ESSO rule: one IR point per habitable room',
                    $c,
                    'ir-per-habitable-room',
                    true
                );
                $add(
                    $items,
                    $n,
                    'Safety',
                    'Smoke detector',
                    1,
                    'ESSO rule: one smoke detector per habitable room',
                    $c,
                    'smoke-per-habitable-room',
                    true
                );
            }

            if ($type === 'kitchen') {
                $foundKitchen = true;
                $foundWaterArea = true;
                $add($items, $n, 'Safety', 'Gas detector', 1, 'ESSO rule: gas detector in kitchen', $c, 'gas-in-kitchen', true);
                $add($items, $n, 'Safety', 'Motorized gas valve', 1, 'ESSO rule: motorized gas shutoff valve in kitchen', $c, 'gas-valve-in-kitchen', true);
                $add($items, $n, 'Safety', 'Water leak sensor', 1, 'ESSO rule: water leak sensor in kitchen', $c, 'leak-in-kitchen', true);
            }

            if ($type === 'bathroom') {
                $foundWaterArea = true;
                $add($items, $n, 'Safety', 'Water leak sensor', 1, 'ESSO rule: water leak sensor in every bathroom', $c, 'leak-per-bathroom', true);
            }

            // Optional requirements selected by the customer.
            $doors = (int)$r['doors'];
            $win = (int)$r['windows'];
            if (isset($req['curtains']) && $win > 0) {
                $add($items, $n, 'Curtains', 'Smart curtain channel', $win, 'Window coverage', $c, 'curtain-per-window', false);
            }
            if (isset($req['hvac'])) {
                $add($items, $n, 'HVAC', 'HVAC control interface', 1, 'Room HVAC control', $c, 'hvac-per-room', false);
            }
            if (isset($req['door_sensors']) && $doors > 0) {
                $add($items, $n, 'Sensors', 'Door sensor', $doors, 'Door monitoring', $c, 'door-per-door', false);
            }
            if (isset($req['window_sensors']) && $win > 0) {
                $add($items, $n, 'Sensors', 'Window sensor', $win, 'Window monitoring', $c, 'window-per-window', false);
            }
            if (isset($req['motion_sensors'])) {
                $add($items, $n, 'Sensors', 'Motion / presence sensor', 1, 'Occupancy monitoring', $c, 'occupancy-per-room', false);
            }
            if (isset($req['temperature_sensors'])) {
                $add($items, $n, 'Sensors', 'Temperature sensor', 1, 'Temperature monitoring', $c, 'temperature-per-room', false);
            }
            if (isset($req['water_leak']) && in_array($type, ['bathroom', 'kitchen', 'laundry', 'utility'], true)) {
                $add($items, $n, 'Safety', 'Water leak sensor', 1, 'Requested wet-area leak monitoring', $c, 'requested-leak-zone', false);
            }
            if (isset($req['gas_sensors']) && $type === 'kitchen') {
                $add($items, $n, 'Safety', 'Gas detector', 1, 'Requested gas monitoring', $c, 'requested-gas-in-kitchen', false);
            }
            if (isset($req['cctv'])) {
                $add($items, $n, 'Security', 'CCTV point', 1, 'Security coverage zone', $c, 'cctv-by-zone', false);
            }
            if (isset($req['access_control']) && $doors > 0) {
                $add($items, $n, 'Security', 'Access control point', 1, 'Requested access control', $c, 'access-control-zone', false);
            }
        }
    }

    // Main water shutoff is one project-level device whenever the project contains a kitchen/bathroom wet area.
    if ($foundWaterArea) {
        $add(
            $items,
            'Project',
            'Safety',
            'Motorized main water valve',
            1,
            'ESSO rule: one motorized valve on the main water line',
            100,
            'main-water-valve',
            true
        );
    }

    $roomsCount = 0;
    foreach ($a['floors'] as $f) {
        $roomsCount += count($f['rooms']);
    }

    if (isset($req['central_panel'])) {
        $add($items, 'Project', 'Control', 'Central touch panel', max(1, (int)ceil(max(1, $roomsCount) / 6)), 'Central control allowance', 100, 'panel-per-six-rooms', false);
    }
    if (isset($req['voice_control'])) {
        $add($items, 'Project', 'Control', 'Voice assistant integration', 1, 'Requested voice control', 100, 'requested-feature', false);
    }
    if (isset($req['mobile_control'])) {
        $add($items, 'Project', 'Control', 'Mobile app integration', 1, 'Requested mobile control', 100, 'requested-feature', false);
    }
    if (isset($req['networking'])) {
        $add($items, 'Project', 'Networking', 'Smart-home network access point', max(1, (int)ceil(max(1, $roomsCount) / 4)), 'Preliminary coverage allowance', 70, 'ap-per-four-rooms', false);
    }
    if (isset($req['home_assistant'])) {
        $add($items, 'Project', 'Platform', 'Home Assistant integration', 1, 'Requested platform integration', 100, 'requested-feature', false);
    }
    if (isset($req['scenes'])) {
        $add($items, 'Project', 'Automation', 'Automation scenes package', 1, 'Requested scene programming', 100, 'requested-scenes-package', false);
    }

    if (!$foundKitchen && in_array('gas_sensors', $requirements, true)) {
        $a['analysis_notes'][] = 'Gas sensor requirement selected but no kitchen was detected; engineering review required.';
    }

    return $items;
}

function build_boq(array $recommendations): array
{
    $boq = [];

    foreach ($recommendations as $i) {
        $key = strtolower($i['category'].'|'.$i['type']);
        if (!isset($boq[$key])) {
            $boq[$key] = [
                'category' => $i['category'],
                'item' => $i['type'],
                'quantity' => 0,
                'unit_price' => null,
                'total' => null,
                'rooms' => [],
                'required' => false,
                'needs_review' => false,
            ];
        }

        $boq[$key]['quantity'] += (int)$i['qty'];
        if ($i['room'] !== 'Project') {
            $boq[$key]['rooms'][] = $i['room'];
        }
        if (($i['confidence'] ?? 0) < 75) {
            $boq[$key]['needs_review'] = true;
        }
        if (($i['required'] ?? 'recommended') === 'required') {
            $boq[$key]['required'] = true;
        }
    }

    foreach ($boq as &$r) {
        $r['rooms'] = array_values(array_unique($r['rooms']));
    }
    unset($r);

    return array_values($boq);
}

function infer_floor_dimensions(array $floor): array
{
    $width = is_numeric($floor['width_m'] ?? null) && $floor['width_m'] > 0 ? (float)$floor['width_m'] : null;
    $depth = is_numeric($floor['depth_m'] ?? null) && $floor['depth_m'] > 0 ? (float)$floor['depth_m'] : null;

    $areas = [];
    foreach (($floor['rooms'] ?? []) as $r) {
        if (is_numeric($r['area_sqm'] ?? null) && $r['area_sqm'] > 0) {
            $areas[] = (float)$r['area_sqm'];
        }
    }

    $totalArea = array_sum($areas);
    if ($width === null || $depth === null) {
        $target = max(20, $totalArea * 1.15);
        $width = $width ?? max(5, sqrt($target * 1.35));
        $depth = $depth ?? max(5, $target / $width);
    }

    return [
        'width_m' => round($width, 2),
        'depth_m' => round($depth, 2),
    ];
}

function create_digital_model(array $project, array $analysis, array $recs, array $boq): array
{
    $rooms = [];
    $devices = [];
    $floorsModel = [];
    $idx = 0;

    foreach ($analysis['floors'] as $floor) {
        $idx++;
        [$floorWidth, $floorDepth] = array_values(infer_floor_dimensions($floor));
        $floorWidth = $floorWidth ?: 12;
        $floorDepth = $floorDepth ?: 10;

        $roomList = [];
        $fallbackCursorX = 0.5;
        $fallbackCursorY = 0.5;
        $fallbackRowDepth = 0.0;
        $roomGap = 0.20;

        foreach ($floor['rooms'] as $ri => $room) {
            $area = (float)($room['area_sqm'] ?? 0);
            $w = is_numeric($room['geometry']['width'] ?? null) && $room['geometry']['width'] > 0
                ? (float)$room['geometry']['width']
                : (float)($room['dimensions']['width'] ?? 0);
            $d = is_numeric($room['geometry']['depth'] ?? null) && $room['geometry']['depth'] > 0
                ? (float)$room['geometry']['depth']
                : (float)($room['dimensions']['length'] ?? 0);

            if ($w <= 0 && $d > 0 && $area > 0) {
                $w = $area / $d;
            }
            if ($d <= 0 && $w > 0 && $area > 0) {
                $d = $area / $w;
            }
            if ($w <= 0 || $d <= 0) {
                $w = max(3.0, min(10.0, sqrt(max(12, $area ?: 24) * 1.20)));
                $d = max(3.0, min(10.0, ($area ?: ($w * 0.8)) / $w));
            }

            $gxPct = $room['geometry']['x'] ?? null;
            $gyPct = $room['geometry']['y'] ?? null;
            $gwPct = $room['geometry']['width'] ?? null;
            $gdPct = $room['geometry']['depth'] ?? null;
            $hasGeometry = is_numeric($gxPct) && is_numeric($gyPct);
            $polygon = is_array($room['geometry']['points'] ?? null) ? $room['geometry']['points'] : [];
            $hasPolygon = count($polygon) >= 3;

            if ($hasGeometry) {
                $gx = ((float)$gxPct / 100) * $floorWidth;
                $gy = ((float)$gyPct / 100) * $floorDepth;
                if (is_numeric($gwPct) && (float)$gwPct > 0) {
                    $w = max(2.2, ((float)$gwPct / 100) * $floorWidth);
                }
                if (is_numeric($gdPct) && (float)$gdPct > 0) {
                    $d = max(2.2, ((float)$gdPct / 100) * $floorDepth);
                }
            } else {
                if ($fallbackCursorX + $w > $floorWidth) {
                    $fallbackCursorX = 0.5;
                    $fallbackCursorY += $fallbackRowDepth + $roomGap;
                    $fallbackRowDepth = 0.0;
                }
                $gx = $fallbackCursorX;
                $gy = $fallbackCursorY;
                $fallbackCursorX += $w + $roomGap;
                $fallbackRowDepth = max($fallbackRowDepth, $d);
            }

            $roomModel = [
                'id' => 'f'.$floor['floor_number'].'r'.($ri + 1),
                'floor' => $floor['floor_number'],
                'name' => $room['name'],
                'type' => $room['type'],
                'area_sqm' => $area > 0 ? $area : null,
                'x' => round((float)$gx, 2),
                'y' => round((float)$gy, 2),
                'width' => round(max(2.2, min(50, $w)), 2),
                'depth' => round(max(2.2, min(50, $d)), 2),
                'confidence' => $room['confidence'],
                'needs_review' => $room['needs_review'] || !$hasGeometry,
                'geometry_source' => $hasPolygon ? 'ai_polygon' : ($hasGeometry ? 'ai_detected' : 'reconstructed_from_room_data'),
                'polygon' => $hasPolygon ? $polygon : [],
                'doors' => $room['doors'],
                'windows' => $room['windows'],
            ];

            $rooms[] = $roomModel;
            $roomList[] = $roomModel['id'];
        }

        $floorsModel[] = [
            'floor_number' => $floor['floor_number'],
            'width_m' => round($floorWidth, 2),
            'depth_m' => round($floorDepth, 2),
            'room_ids' => $roomList,
            'needs_review' => count(array_filter($rooms, static fn($r) => $r['floor'] === $floor['floor_number'] && $r['needs_review'])) > 0,
        ];
    }

    foreach ($recs as $i => $r) {
        $devices[] = [
            'id' => 'd'.($i + 1),
            'room' => $r['room'],
            'type' => $r['type'],
            'category' => $r['category'],
            'qty' => (int)$r['qty'],
            'required' => $r['required'] ?? 'required',
            'confidence' => $r['confidence'],
            'reason' => $r['reason'] ?? '',
            'rule' => $r['rule'] ?? '',
        ];
    }

    $homeAssistant = [
        'entities' => [],
        'scenes' => [
            ['id' => 'scene_arrival', 'name' => 'Arrival'],
            ['id' => 'scene_night', 'name' => 'Night'],
        ],
        'automations' => [
            ['id' => 'auto_motion_lighting', 'name' => 'Motion lighting'],
            ['id' => 'auto_security_alert', 'name' => 'Security alert'],
            ['id' => 'auto_gas_shutoff', 'name' => 'Gas leak shutoff'],
            ['id' => 'auto_water_shutoff', 'name' => 'Water leak shutoff'],
        ],
    ];

    foreach ($devices as $d) {
        $slug = preg_replace('/[^a-z0-9]+/i', '_', strtolower($d['room'].'_'.$d['type']));
        $homeAssistant['entities'][] = [
            'entity_id' => 'sensor.esso_'.$slug,
            'name' => $d['room'].' - '.$d['type'],
            'room' => $d['room'],
        ];
    }

    return [
        'version' => 2,
        'project' => [
            'type' => $project['project_type'] ?? '',
            'area_sqm' => $project['area'] ?? null,
            'floors' => $project['floors'] ?? null,
            'location' => $project['location'] ?? '',
        ],
        'floors' => $floorsModel,
        'rooms' => $rooms,
        'devices' => $devices,
        'boq' => $boq,
        'home_assistant' => $homeAssistant,
        'preview' => [
            'watermarked' => true,
            'download_disabled' => true,
            'source_files_private' => true,
            'geometry_is_preliminary' => true,
            'viewer_mode' => 'home-assistant-style',
        ],
    ];
}

function save_project(array $payload): array
{
    $token = strtoupper(bin2hex(random_bytes(6)));
    $record = [
        'token' => $token,
        'created_at' => gmdate('c'),
        'status' => 'draft',
        'customer' => [
            'name' => clean_string($payload['project']['name'] ?? '', 120),
            'email' => clean_string($payload['project']['email'] ?? '', 160),
            'phone' => clean_string($payload['project']['phone'] ?? '', 60),
        ],
        'project' => $payload['project'] ?? [],
        'requirements' => clean_array($payload['project']['requirements'] ?? [], 30),
        'files' => $payload['files'] ?? [],
        'analysis' => validate_analysis((array)($payload['analysis'] ?? [])),
        'recommendations' => $payload['recommendations'] ?? [],
        'boq' => $payload['boq'] ?? [],
    ];

    $record['digital_model'] = create_digital_model(
        $record['project'],
        $record['analysis'],
        $record['recommendations'],
        $record['boq']
    );
    $record['versions'] = [
        ['version' => 1, 'at' => $record['created_at'], 'status' => 'draft'],
    ];

    file_put_contents(
        PROJECTS_PATH.'/'.$token.'.json',
        json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );

    return [
        'project_token' => $token,
        'viewer_url' => BASE_URL.'project-viewer.html?token='.$token,
        'status' => $record['status'],
    ];
}

function load_project(string $token): ?array
{
    if (!preg_match('/^[A-F0-9]{12}$/', $token)) {
        return null;
    }

    $p = PROJECTS_PATH.'/'.$token.'.json';
    if (!is_file($p)) {
        return null;
    }

    $x = json_decode(file_get_contents($p), true);
    return is_array($x) ? $x : null;
}

function save_project_record(array $record): bool
{
    return file_put_contents(
        PROJECTS_PATH.'/'.$record['token'].'.json',
        json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    ) !== false;
}

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
    $raw = trim($type.' '.$name);
    $v = strtolower(preg_replace('/[^a-z0-9\x{0600}-\x{06ff}]+/u',' ', $raw) ?: $raw);
    $v = preg_replace('/\s+/',' ',trim($v)) ?: trim($v);
    $map = [
        'reception'=>['reception','salon','saloon','majlis','living reception','reception area','ريسبشن','ريسبسيون','صالون','مجلس','استقبال'],
        'living_room'=>['living room','living','lounge','family living','living area','معيشة','ليفينج','غرفة المعيشة','معيشة عائلية'],
        'master_bedroom'=>['master bedroom','master bed','mbr','bedroom master','master','غرفة النوم الرئيسية','غرفة نوم رئيسية','ماستر','غرفة الماستر'],
        'bedroom'=>['bedroom','bed room','guest room','guest','kids room','kids','children room','children','br','غرفة نوم','نوم','غرفة أطفال','أطفال','غرفة ضيوف','ضيوف'],
        'kitchen'=>['kitchen','kit','مطبخ'],
        'bathroom'=>['bathroom','bath','toilet','wc','w c','shower','ensuite','en suite','حمام','دورة مياه','شاور'],
        'corridor'=>['corridor','hallway','hall','passage','landing','ممر','طرقة','هول'],
        'office'=>['office','study','workspace','مكتب','دراسة'],
        'dining'=>['dining room','dining area','dining','سفرة','غرفة السفرة','طعام'],
        'laundry'=>['laundry room','laundry','wash','غسيل','غرفة غسيل','مغسلة ملابس'],
        'utility'=>['utility','service room','service','store','storage','مخزن','خدمات','غرفة خدمات','مستودع'],
    ];
    foreach($map as $canonical=>$terms){
        foreach($terms as $term){
            $needle=strtolower($term);
            if($needle!=='' && preg_match('/(^| )'.preg_quote($needle,'/').'($| )/u',$v)) return $canonical;
        }
    }
    foreach($map as $canonical=>$terms){
        foreach($terms as $term){
            $needle=strtolower($term);
            if(mb_strlen($needle)>=5 && strpos($v,$needle)!==false) return $canonical;
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

function normalize_geometry_points($points,int $maxPoints=120): array
{
    $out=[]; if(!is_array($points)) return $out;
    foreach(array_slice($points,0,$maxPoints) as $pt){
        if(!is_array($pt)||!is_numeric($pt['x']??null)||!is_numeric($pt['y']??null)) continue;
        $out[]=['x'=>max(0.0,min(100.0,(float)$pt['x'])),'y'=>max(0.0,min(100.0,(float)$pt['y']))];
    }
    return count($out)>=3?$out:[];
}

function polygon_area_percent(array $points): float
{
    if(count($points)<3) return 0.0;
    $s=0.0;$n=count($points);
    for($i=0;$i<$n;$i++){ $j=($i+1)%$n; $s+=((float)$points[$i]['x']*(float)$points[$j]['y'])-((float)$points[$j]['x']*(float)$points[$i]['y']); }
    return abs($s)/2.0;
}

function polygon_bbox(array $points): array
{
    if(!$points) return ['x'=>null,'y'=>null,'width'=>null,'depth'=>null];
    $xs=array_column($points,'x');$ys=array_column($points,'y');
    $minX=min($xs);$maxX=max($xs);$minY=min($ys);$maxY=max($ys);
    return ['x'=>$minX,'y'=>$minY,'width'=>max(0.0,$maxX-$minX),'depth'=>max(0.0,$maxY-$minY)];
}

function normalize_opening_details($items,string $kind): array
{
    $out=[]; if(!is_array($items)) return $out;
    foreach(array_slice($items,0,100) as $item){
        if(!is_array($item)||!is_numeric($item['x']??null)||!is_numeric($item['y']??null)) continue;
        $wall=clean_string($item['wall']??'unknown',20);
        if(!in_array($wall,['north','south','east','west','unknown'],true)) $wall='unknown';
        $row=['x'=>max(0,min(100,(float)$item['x'])),'y'=>max(0,min(100,(float)$item['y'])),'width_pct'=>is_numeric($item['width_pct']??null)?max(.1,min(100,(float)$item['width_pct'])):null,'wall'=>$wall,'confidence'=>is_numeric($item['confidence']??null)?max(0,min(100,(float)$item['confidence'])):0];
        if($kind==='door'){ $s=clean_string($item['swing']??'unknown',20); if(!in_array($s,['inward','outward','sliding','unknown'],true)) $s='unknown'; $row['swing']=$s; }
        $out[]=$row;
    }
    return $out;
}

function normalize_wall_rows($items): array
{
    $out=[]; if(!is_array($items)) return $out;
    foreach(array_slice($items,0,300) as $i=>$wall){
        if(!is_array($wall)) continue; $pts=normalize_geometry_points($wall['points']??[],8); if(count($pts)<2) continue;
        $type=clean_string($wall['type']??'interior',30); if(!in_array($type,['exterior','interior','partition','unknown'],true)) $type='unknown';
        $out[]=['id'=>clean_string($wall['id']??('w'.($i+1)),40),'type'=>$type,'points'=>$pts,'thickness_m'=>is_numeric($wall['thickness_m']??null)&&$wall['thickness_m']>0?min(2.0,(float)$wall['thickness_m']):null,'confidence'=>is_numeric($wall['confidence']??null)?max(0,min(100,(float)$wall['confidence'])):0,'needs_review'=>(bool)($wall['needs_review']??false)];
    }
    return $out;
}

function validate_analysis(array $data): array
{
    $o=['project'=>['total_area_sqm'=>null,'floors_count'=>0,'orientation'=>'unknown','confidence'=>0],'floors'=>[],'analysis_notes'=>[],'needs_review'=>[]];
    $p=is_array($data['project']??null)?$data['project']:[];
    $o['project']['total_area_sqm']=is_numeric($p['total_area_sqm']??null)&&$p['total_area_sqm']>0&&$p['total_area_sqm']<=100000?(float)$p['total_area_sqm']:null;
    $o['project']['floors_count']=is_numeric($p['floors_count']??null)&&$p['floors_count']>=1&&$p['floors_count']<=100?(int)$p['floors_count']:0;
    $o['project']['orientation']=clean_string($p['orientation']??'unknown',40)||'unknown';
    $o['project']['confidence']=is_numeric($p['confidence']??null)?max(0,min(100,(float)$p['confidence'])):0;

    foreach(array_slice(is_array($data['floors']??null)?$data['floors']:[],0,100) as $fi=>$floor){
        if(!is_array($floor)) continue;
        $no=is_numeric($floor['floor_number']??null)?max(1,min(100,(int)$floor['floor_number'])):$fi+1;
        $fw=is_numeric($floor['width_m']??null)&&$floor['width_m']>0?min(500,(float)$floor['width_m']):null;
        $fd=is_numeric($floor['depth_m']??null)&&$floor['depth_m']>0?min(500,(float)$floor['depth_m']):null;
        $env=is_array($floor['envelope']??null)?$floor['envelope']:[];
        $envPts=normalize_geometry_points($env['points']??[],120);
        $envConf=is_numeric($env['confidence']??null)?max(0,min(100,(float)$env['confidence'])):0;
        $envNeeds=(bool)($env['needs_review']??(count($envPts)<3));
        $rooms=[];
        foreach(array_slice(is_array($floor['rooms']??null)?$floor['rooms']:[],0,150) as $ri=>$room){
            if(!is_array($room)) continue;
            $name=clean_string($room['name']??('Room '.($ri+1)),120);
            $type=normalize_room_type(clean_string($room['type']??'other',50),$name);
            $conf=is_numeric($room['confidence']??null)?max(0,min(100,(float)$room['confidence'])):0;
            $dim=is_array($room['dimensions']??null)?$room['dimensions']:[];
            $width=is_numeric($dim['width']??null)&&$dim['width']>0?min(200,(float)$dim['width']):null;
            $length=is_numeric($dim['length']??null)&&$dim['length']>0?min(200,(float)$dim['length']):null;
            $area=is_numeric($room['area_sqm']??null)&&$room['area_sqm']>0?min(10000,(float)$room['area_sqm']):null;
            $g=is_array($room['geometry']??null)?$room['geometry']:[];
            $pts=normalize_geometry_points($g['points']??[],120);
            $gx=is_numeric($g['x']??null)?max(0,min(100,(float)$g['x'])):null;
            $gy=is_numeric($g['y']??null)?max(0,min(100,(float)$g['y'])):null;
            $gw=is_numeric($g['width']??null)?max(0,min(100,(float)$g['width'])):null;
            $gd=is_numeric($g['depth']??null)?max(0,min(100,(float)$g['depth'])):null;
            if($pts){$bb=polygon_bbox($pts);if($gx===null)$gx=$bb['x'];if($gy===null)$gy=$bb['y'];if($gw===null)$gw=$bb['width'];if($gd===null)$gd=$bb['depth'];}
            if($area===null&&$width!==null&&$length!==null)$area=round($width*$length,2);
            if($width===null&&$area!==null&&$length!==null&&$length>0)$width=round($area/$length,2);
            if($length===null&&$area!==null&&$width!==null&&$width>0)$length=round($area/$width,2);
            $doors=normalize_opening_details($room['door_details']??[],'door');
            $windows=normalize_opening_details($room['window_details']??[],'window');
            $doorCount=is_numeric($room['doors']??null)?max(0,min(100,(int)$room['doors'])):count($doors);
            $windowCount=is_numeric($room['windows']??null)?max(0,min(100,(int)$room['windows'])):count($windows);
            if($doors&&!$doorCount)$doorCount=count($doors); if($windows&&!$windowCount)$windowCount=count($windows);
            $ev=is_array($room['evidence']??null)?$room['evidence']:[];
            $evidence=['label_detected'=>(bool)($ev['label_detected']??false),'label_text'=>clean_string($ev['label_text']??'',120),'boundary_detected'=>(bool)($ev['boundary_detected']??(bool)$pts),'visual_context'=>clean_string($ev['visual_context']??'',300),'fixtures_detected'=>clean_array($ev['fixtures_detected']??[],30),'doors_detected'=>max(0,min(100,(int)($ev['doors_detected']??$doorCount))),'windows_detected'=>max(0,min(100,(int)($ev['windows_detected']??$windowCount))),'adjacency_evidence'=>clean_array($ev['adjacency_evidence']??[],30)];
            $status=clean_string($room['status']??'unknown',20); if(!in_array($status,['detected','inferred','unknown'],true))$status=$conf>=75?'detected':($conf>0?'inferred':'unknown');
            $needs=(bool)($room['needs_review']??false);
            if($conf<75||!$evidence['boundary_detected']||($pts&&polygon_area_percent($pts)<.05))$needs=true;
            $adj=clean_array($room['adjacent_rooms']??[],30);
            $rooms[]=['name'=>$name,'type'=>$type,'area_sqm'=>$area,'dimensions'=>['width'=>$width,'length'=>$length],'doors'=>$doorCount,'windows'=>$windowCount,'door_details'=>$doors,'window_details'=>$windows,'geometry'=>['x'=>$gx,'y'=>$gy,'width'=>$gw,'depth'=>$gd,'points'=>$pts],'confidence'=>$conf,'status'=>$status,'needs_review'=>$needs,'evidence'=>$evidence,'adjacent_rooms'=>$adj];
        }
        $walls=normalize_wall_rows($floor['walls']??[]);
        $stairs=is_array($floor['stairs']??null)?array_slice($floor['stairs'],0,50):[];
        $o['floors'][]=['floor_number'=>$no,'width_m'=>$fw,'depth_m'=>$fd,'envelope'=>['points'=>$envPts,'confidence'=>$envConf,'needs_review'=>$envNeeds],'walls'=>$walls,'rooms'=>$rooms,'stairs'=>$stairs];
    }
    $o['project']['floors_count']=$o['project']['floors_count']?:count($o['floors']);
    foreach((array)($data['analysis_notes']??$data['notes']??[]) as $note){$note=clean_string($note,350);if($note!=='')$o['analysis_notes'][]=$note;}
    $o['analysis_notes']=array_values(array_unique($o['analysis_notes']));
    foreach($o['floors'] as $floor){
        if(count($floor['envelope']['points'])<3)$o['needs_review'][]='Floor '.$floor['floor_number'].' envelope could not be localized reliably.';
        foreach($floor['rooms'] as $room){
            if($room['needs_review'])$o['needs_review'][]=$room['name'].' requires engineering review.';
            if($room['area_sqm']===null)$o['needs_review'][]=$room['name'].' area could not be verified from the plan.';
            if(count($room['geometry']['points'])<3&&($room['geometry']['width']===null||$room['geometry']['depth']===null))$o['needs_review'][]=$room['name'].' boundary geometry is incomplete.';
        }
    }
    $o['needs_review']=array_values(array_unique($o['needs_review']));
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

function unique_floor_edges(array $polygons): array
{
    $edges=[];
    foreach($polygons as $poly){ if(count($poly)<2)continue; $n=count($poly); for($i=0;$i<$n;$i++){
        $a=$poly[$i];$b=$poly[($i+1)%$n];$k1=sprintf('%.2f,%.2f',(float)$a['x'],(float)$a['y']);$k2=sprintf('%.2f,%.2f',(float)$b['x'],(float)$b['y']);$key=strcmp($k1,$k2)<=0?$k1.'|'.$k2:$k2.'|'.$k1;
        if(isset($edges[$key]))continue;
        $edges[$key]=['points'=>[['x'=>(float)$a['x'],'y'=>(float)$a['y']],['x'=>(float)$b['x'],'y'=>(float)$b['y']]],'type'=>'interior','thickness_m'=>null,'confidence'=>55,'needs_review'=>true];
    }}
    return array_values($edges);
}

function create_digital_model(array $project,array $analysis,array $recs,array $boq): array
{
    $rooms=[];$devices=[];$floorsModel=[];
    foreach($analysis['floors'] as $floor){
        [$floorWidth,$floorDepth]=array_values(infer_floor_dimensions($floor));
        $floorWidth=$floorWidth?:12.0;$floorDepth=$floorDepth?:10.0;
        $envelopePoints=$floor['envelope']['points']??[];$roomPolygons=[];
        foreach($floor['rooms'] as $r){if(count($r['geometry']['points']??[])>=3)$roomPolygons[]=$r['geometry']['points'];}
        $envelopeSource='ai_envelope';
        if(count($envelopePoints)<3){
            if($roomPolygons){$xs=[];$ys=[];foreach($roomPolygons as $poly)foreach($poly as $p){$xs[]=$p['x'];$ys[]=$p['y'];}$envelopePoints=[['x'=>min($xs),'y'=>min($ys)],['x'=>max($xs),'y'=>min($ys)],['x'=>max($xs),'y'=>max($ys)],['x'=>min($xs),'y'=>max($ys)]];$envelopeSource='derived_from_room_geometry';}
            else{$envelopePoints=[['x'=>0,'y'=>0],['x'=>100,'y'=>0],['x'=>100,'y'=>100],['x'=>0,'y'=>100]];$envelopeSource='visual_fallback';}
        }
        $walls=$floor['walls']??[]; if(!$walls)$walls=unique_floor_edges(array_merge($roomPolygons,[$envelopePoints]));
        $floorRoomIds=[];
        foreach($floor['rooms'] as $ri=>$room){
            $area=is_numeric($room['area_sqm']??null)?(float)$room['area_sqm']:null;$g=$room['geometry']??[];$polygon=$g['points']??[];
            $gx=is_numeric($g['x']??null)?(float)$g['x']:null;$gy=is_numeric($g['y']??null)?(float)$g['y']:null;$gw=is_numeric($g['width']??null)?(float)$g['width']:null;$gd=is_numeric($g['depth']??null)?(float)$g['depth']:null;
            if(count($polygon)>=3){$bb=polygon_bbox($polygon);if($gx===null)$gx=$bb['x'];if($gy===null)$gy=$bb['y'];if($gw===null)$gw=$bb['width'];if($gd===null)$gd=$bb['depth'];}
            $xMeters=$gx!==null?($gx/100)*$floorWidth:null;$yMeters=$gy!==null?($gy/100)*$floorDepth:null;$wMeters=$gw!==null&&$gw>0?($gw/100)*$floorWidth:null;$dMeters=$gd!==null&&$gd>0?($gd/100)*$floorDepth:null;
            if($wMeters===null&&is_numeric($room['dimensions']['width']??null)&&$room['dimensions']['width']>0)$wMeters=(float)$room['dimensions']['width'];
            if($dMeters===null&&is_numeric($room['dimensions']['length']??null)&&$room['dimensions']['length']>0)$dMeters=(float)$room['dimensions']['length'];
            if($wMeters===null&&$dMeters!==null&&$area!==null)$wMeters=$area/$dMeters;
            if($dMeters===null&&$wMeters!==null&&$area!==null)$dMeters=$area/$wMeters;
            $roomModel=['id'=>'f'.$floor['floor_number'].'r'.($ri+1),'floor'=>$floor['floor_number'],'name'=>$room['name'],'type'=>$room['type'],'area_sqm'=>$area,'x'=>round((float)($xMeters??0),3),'y'=>round((float)($yMeters??0),3),'width'=>round((float)($wMeters??0),3),'depth'=>round((float)($dMeters??0),3),'confidence'=>$room['confidence'],'needs_review'=>(bool)$room['needs_review'],'geometry_source'=>count($polygon)>=3?'ai_polygon':(($gx!==null&&$gy!==null)?'ai_bbox':'missing'),'polygon'=>$polygon,'dimensions'=>$room['dimensions'],'doors'=>$room['doors'],'windows'=>$room['windows'],'door_details'=>$room['door_details'],'window_details'=>$room['window_details'],'evidence'=>$room['evidence'],'adjacent_rooms'=>$room['adjacent_rooms'],'geometry_validation'=>['polygon_area_percent'=>count($polygon)>=3?round(polygon_area_percent($polygon),2):0,'validation_status'=>(bool)$room['needs_review']?'review':'valid']];
            $rooms[]=$roomModel;$floorRoomIds[]=$roomModel['id'];
        }
        $floorsModel[]=['floor_number'=>$floor['floor_number'],'width_m'=>round($floorWidth,3),'depth_m'=>round($floorDepth,3),'room_ids'=>$floorRoomIds,'envelope'=>['points'=>$envelopePoints,'confidence'=>$floor['envelope']['confidence']??0,'needs_review'=>($floor['envelope']['needs_review']??false)||$envelopeSource!=='ai_envelope','source'=>$envelopeSource],'walls'=>$walls,'stairs'=>$floor['stairs']??[],'needs_review'=>($floor['envelope']['needs_review']??false)||$envelopeSource!=='ai_envelope'||count(array_filter($floor['rooms'],static fn($r)=>$r['needs_review']))>0];
    }
    foreach($recs as $i=>$r)$devices[]=['id'=>'d'.($i+1),'room'=>$r['room'],'type'=>$r['type'],'category'=>$r['category'],'qty'=>(int)$r['qty'],'required'=>$r['required']??'required','confidence'=>$r['confidence'],'reason'=>$r['reason']??'','rule'=>$r['rule']??''];
    $homeAssistant=['entities'=>[],'scenes'=>[['id'=>'scene_arrival','name'=>'Arrival'],['id'=>'scene_night','name'=>'Night']],'automations'=>[['id'=>'auto_motion_lighting','name'=>'Motion lighting'],['id'=>'auto_security_alert','name'=>'Security alert'],['id'=>'auto_gas_shutoff','name'=>'Gas leak shutoff'],['id'=>'auto_water_shutoff','name'=>'Water leak shutoff']]];
    foreach($devices as $d){$slug=preg_replace('/[^a-z0-9]+/i','_',strtolower($d['room'].'_'.$d['type']));$homeAssistant['entities'][]=['entity_id'=>'sensor.esso_'.$slug,'name'=>$d['room'].' - '.$d['type'],'room'=>$d['room']];}
    return ['version'=>3,'project'=>['type'=>$project['project_type']??'','area_sqm'=>$project['area']??null,'floors'=>$project['floors']??null,'location'=>$project['location']??'','orientation'=>$analysis['project']['orientation']??'unknown'],'floors'=>$floorsModel,'rooms'=>$rooms,'devices'=>$devices,'boq'=>$boq,'home_assistant'=>$homeAssistant,'preview'=>['watermarked'=>true,'download_disabled'=>true,'source_files_private'=>true,'geometry_is_preliminary'=>true,'viewer_mode'=>'architectural-digital-twin']];
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

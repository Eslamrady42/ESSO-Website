<?php
declare(strict_types=1);
if (session_status() !== PHP_SESSION_ACTIVE) {
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_set_cookie_params(['httponly'=>true,'secure'=>$secure,'samesite'=>'Lax']);
    session_start();
}
$env=[];
$envCandidates = [
    dirname(__DIR__).'/.env',
    dirname(__DIR__).'/.env.local',
    __DIR__.'/.env',
    dirname(dirname(__DIR__)).'/.env',
];
foreach (array_unique($envCandidates) as $envPath) {
    if (!is_readable($envPath)) {
        continue;
    }
    $x = @parse_ini_file($envPath, false, INI_SCANNER_RAW);
    if (is_array($x)) {
        $env = array_merge($env, $x);
    }
}
function env_value(string $k,string $d=''):string { global $env; $v=$env[$k]??getenv($k); return ($v===false||$v===null)?$d:trim((string)$v); }
function env_is_configured(string $k): bool { return env_value($k,'') !== ''; }
define('APP_ENV',env_value('APP_ENV','production'));
define('BASE_URL',env_value('BASE_URL','/'));
define('SITE_URL',rtrim(env_value('SITE_URL',''),'/'));
define('OPENAI_API_KEY',env_value('OPENAI_API_KEY',''));
define('OPENAI_MODEL',env_value('OPENAI_MODEL','gpt-4.1'));
define('OPENAI_TIMEOUT',max(20,(int)env_value('OPENAI_TIMEOUT','90')));
define('GEMINI_API_KEY', env_value('GEMINI_API_KEY', ''));
define('GEMINI_MODEL',env_value('GEMINI_MODEL','gemini-3.8-flash'));
define('GEMINI_FALLBACK_MODELS',env_value('GEMINI_FALLBACK_MODELS','gemini-3.5-flash-lite,gemini-3.7-flash,gemini-3.5-flash,gemini-3.8-flash'));
define('GEMINI_TIMEOUT',max(20,(int)env_value('GEMINI_TIMEOUT','120')));
define('ADMIN_EMAIL',env_value('ADMIN_EMAIL','info25.esso@gmail.com'));
define('ADMIN_KEY',env_value('ADMIN_KEY',''));
define('UPLOAD_MAX_SIZE',max(1048576,(int)env_value('UPLOAD_MAX_SIZE','10485760')));
define('RATE_LIMIT_UPLOAD_MAX',max(1,(int)env_value('RATE_LIMIT_UPLOAD_MAX','20')));
define('RATE_LIMIT_UPLOAD_PERIOD',max(60,(int)env_value('RATE_LIMIT_UPLOAD_PERIOD','600')));
define('RATE_LIMIT_ANALYZE_MAX',max(1,(int)env_value('RATE_LIMIT_ANALYZE_MAX','10')));
define('RATE_LIMIT_ANALYZE_PERIOD',max(60,(int)env_value('RATE_LIMIT_ANALYZE_PERIOD','900')));
define('RATE_LIMIT_DESIGN_MAX',max(1,(int)env_value('RATE_LIMIT_DESIGN_MAX','3')));
define('RATE_LIMIT_DESIGN_PERIOD',max(60,(int)env_value('RATE_LIMIT_DESIGN_PERIOD','86400')));
define('ROOT_PATH',dirname(__DIR__));
if (GEMINI_API_KEY === '') { $localGemini=dirname(__DIR__).'/storage/private/gemini.key'; if (is_readable($localGemini)) { $savedGemini=trim((string)@file_get_contents($localGemini)); if ($savedGemini!=='') { define('ESSO_LOCAL_GEMINI_KEY',$savedGemini); } else { define('ESSO_LOCAL_GEMINI_KEY',''); } } else { define('ESSO_LOCAL_GEMINI_KEY',''); } } else { define('ESSO_LOCAL_GEMINI_KEY',''); }
if (GEMINI_API_KEY === '' && ESSO_LOCAL_GEMINI_KEY !== '') { /* constant is immutable; provider reads helper below */ }

define('UPLOADS_PATH',ROOT_PATH.'/uploads');
define('PRIVATE_UPLOAD_PATH',UPLOADS_PATH.'/private');
define('RATE_LIMIT_PATH',UPLOADS_PATH.'/rate');
define('STORAGE_PATH',ROOT_PATH.'/storage');
define('PROJECTS_PATH',STORAGE_PATH.'/projects');
define('LOGS_PATH',ROOT_PATH.'/logs');
foreach([UPLOADS_PATH,PRIVATE_UPLOAD_PATH,RATE_LIMIT_PATH,STORAGE_PATH,PROJECTS_PATH,LOGS_PATH] as $dir){if(!is_dir($dir))@mkdir($dir,0750,true);}
if(APP_ENV==='development'){error_reporting(E_ALL);ini_set('display_errors','1');}else{error_reporting(0);ini_set('display_errors','0');}
function json_response(array $data,int $status=200):never{http_response_code($status);header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store, private');echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function fail_json(string $message,int $status=400):never{json_response(['success'=>false,'message'=>$message],$status);}

function gemini_api_key(): string { return GEMINI_API_KEY !== '' ? GEMINI_API_KEY : (defined('ESSO_LOCAL_GEMINI_KEY') ? ESSO_LOCAL_GEMINI_KEY : ''); }
function gemini_configured(): bool { return gemini_api_key() !== ''; }

<?php
declare(strict_types=1);
require_once __DIR__.'/functions.php';
if(($_SERVER['REQUEST_METHOD']??'GET')!=='GET') fail_json('Method not allowed.',405);
$key=gemini_api_key(); if($key==='') fail_json('Gemini API key is not configured on the server.',503);

$models = array_values(array_unique(array_filter(array_merge(
    [GEMINI_MODEL],
    array_map('trim', explode(',', GEMINI_FALLBACK_MODELS))
))));

$results=[];
foreach($models as $model){
    $payload=['contents'=>[['role'=>'user','parts'=>[['text'=>'Reply with exactly OK.']]]]];
    $url='https://generativelanguage.googleapis.com/v1beta/models/'.rawurlencode($model).':generateContent?key='.rawurlencode($key);
    $ch=@curl_init($url);
    if($ch===false){$results[]=['model'=>$model,'success'=>false,'http_status'=>0,'message'=>'Could not initialize cURL.'];continue;}
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>25,CURLOPT_POST=>true,CURLOPT_HTTPHEADER=>['Content-Type: application/json','Accept: application/json'],CURLOPT_POSTFIELDS=>json_encode($payload)]);
    $body=curl_exec($ch); $err=curl_error($ch); $code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE); curl_close($ch);
    $j=json_decode((string)$body,true);
    if($code>=200&&$code<300){json_response(['success'=>true,'model'=>$model,'message'=>'Gemini connection works.','tried'=>$results]);}
    $msg=is_array($j)?clean_string($j['error']['message']??'',1200):'';
    $results[]=['model'=>$model,'success'=>false,'http_status'=>$code,'message'=>$msg!==''?$msg:$err];
    if(in_array($code,[401,403],true)) break;
}
$last=end($results);
fail_json(($last['message']??'Gemini request failed.').' Tried: '.implode(', ',array_column($results,'model')),isset($last['http_status'])&&$last['http_status']>0?(int)$last['http_status']:502);

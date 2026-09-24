<?php
declare(strict_types=1);
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/csrf.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail_json('Method not allowed.',405);
if (!csrf_valid($_POST['csrf_token'] ?? null)) fail_json('Invalid security token.',403);
if (!rate_limit('upload:'.client_ip(),RATE_LIMIT_UPLOAD_MAX,RATE_LIMIT_UPLOAD_PERIOD)) fail_json('Too many upload attempts. Please try again later.',429);
if (empty($_FILES['files']) || !is_array($_FILES['files']['name'] ?? null)) fail_json('Please select at least one file.');
$allowedExt=['jpg','jpeg','png','pdf','dxf','dwg']; $allowedMime=['jpg'=>['image/jpeg'],'jpeg'=>['image/jpeg'],'png'=>['image/png'],'pdf'=>['application/pdf'],'dxf'=>[],'dwg'=>[]]; $uploaded=[]; $errors=[];
foreach($_FILES['files']['name'] as $i=>$original){
    $error=(int)($_FILES['files']['error'][$i] ?? UPLOAD_ERR_NO_FILE); $tmp=(string)($_FILES['files']['tmp_name'][$i] ?? ''); $size=(int)($_FILES['files']['size'][$i] ?? 0);
    if($error!==UPLOAD_ERR_OK){$errors[]=safe_filename($original).': upload failed.';continue;}
    if($size<=0||$size>UPLOAD_MAX_SIZE){$errors[]=safe_filename($original).': invalid size or file exceeds 10MB.';continue;}
    $ext=strtolower(pathinfo($original,PATHINFO_EXTENSION)); if(!in_array($ext,$allowedExt,true)){$errors[]=safe_filename($original).': unsupported file type.';continue;}
    $mime=''; if(function_exists('finfo_open')){$fi=finfo_open(FILEINFO_MIME_TYPE);$mime=$fi?(string)finfo_file($fi,$tmp):'';if($fi)finfo_close($fi);}
    if(in_array($ext,['jpg','jpeg','png'],true) && (!@getimagesize($tmp)||!in_array($mime,$allowedMime[$ext],true))){$errors[]=safe_filename($original).': invalid image content.';continue;}
    if($ext==='pdf' && $mime!=='application/pdf'){$errors[]=safe_filename($original).': invalid PDF content.';continue;}
    $stored=random_id().'.'.$ext; $dest=PRIVATE_UPLOAD_PATH.'/'.$stored;
    if(!move_uploaded_file($tmp,$dest)){$errors[]=safe_filename($original).': could not be stored.';continue;}
    @chmod($dest,0640); $uploaded[]=['id'=>$stored,'name'=>safe_filename($original),'size'=>$size,'extension'=>$ext,'mime'=>$mime];
}
if(!$uploaded) fail_json(implode(' ',$errors)?:'No valid files were uploaded.');
json_response(['success'=>true,'files'=>$uploaded,'errors'=>$errors]);

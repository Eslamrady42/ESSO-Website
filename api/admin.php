<?php
declare(strict_types=1);
require_once __DIR__.'/functions.php';
$provided=$_SERVER['HTTP_X_ADMIN_KEY']??($_GET['key']??'');if(!ADMIN_KEY||!hash_equals(ADMIN_KEY,(string)$provided))fail_json('Unauthorized.',401);
if($_SERVER['REQUEST_METHOD']==='GET'){$out=[];foreach(glob(PROJECTS_PATH.'/*.json')?:[] as $f){$p=json_decode(file_get_contents($f),true);if(is_array($p))$out[]=['token'=>$p['token'],'created_at'=>$p['created_at'],'status'=>$p['status'],'name'=>$p['customer']['name']??'','email'=>$p['customer']['email']??''];}usort($out,fn($a,$b)=>strcmp($b['created_at'],$a['created_at']));json_response(['success'=>true,'projects'=>$out]);}
if($_SERVER['REQUEST_METHOD']==='POST'){$in=json_decode(file_get_contents('php://input'),true);$p=load_project(strtoupper(clean_string($in['token']??'',12)));if(!$p)fail_json('Project not found.',404);$status=in_array($in['status']??'', ['draft','conversion_requested','engineering_review','quoted','approved','finalized','delivered'], true)?$in['status']:'draft';$p['status']=$status;$p['versions'][]=['version'=>count($p['versions'])+1,'at'=>gmdate('c'),'status'=>$status];save_project_record($p);json_response(['success'=>true,'status'=>$status]);}
fail_json('Method not allowed.',405);

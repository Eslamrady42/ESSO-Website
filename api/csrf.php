<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
function csrf_token():string{if(empty($_SESSION['csrf_token'])||(int)($_SESSION['csrf_time']??0)<time()-3600){$_SESSION['csrf_token']=bin2hex(random_bytes(32));$_SESSION['csrf_time']=time();}return$_SESSION['csrf_token'];}
function csrf_valid(?string $token):bool{return is_string($token)&&$token!==''&&!empty($_SESSION['csrf_token'])&&hash_equals($_SESSION['csrf_token'],$token);}

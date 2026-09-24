<?php
declare(strict_types=1);
require_once __DIR__.'/api/bootstrap.php';
$message='';
if($_SERVER['REQUEST_METHOD']==='POST'){
  $key=trim((string)($_POST['gemini_api_key']??''));
  if($key===''){ $message='Enter a Gemini API key.'; }
  else {
    $dir=ROOT_PATH.'/storage/private'; if(!is_dir($dir)) @mkdir($dir,0750,true);
    $path=$dir.'/gemini.key'; if(@file_put_contents($path,$key."\n",LOCK_EX)!==false){ @chmod($path,0600); $message='Gemini key saved securely. Restart Apache, then check health.php.'; }
    else $message='Unable to save the key. Check folder permissions.';
  }
}
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ESSO | Gemini Setup</title><link rel="stylesheet" href="css/style.css"></head><body><main class="container" style="max-width:760px;padding:60px 20px"><h1>ESSO Gemini Setup</h1><p>Enter your Gemini API key. It is stored only on the server.</p><?php if($message!==''): ?><div style="padding:15px;margin:15px 0;border:1px solid #ccc;border-radius:8px"><?php echo htmlspecialchars($message,ENT_QUOTES,'UTF-8'); ?></div><?php endif; ?><form method="post"><label for="key">Gemini API Key</label><input id="key" name="gemini_api_key" type="password" autocomplete="off" required style="width:100%;padding:12px;margin:8px 0 16px"><button class="btn btn-primary" type="submit">Save key securely</button></form><p style="margin-top:20px"><a href="api/health.php">Check API health</a> · <a href="smart-home.html">Smart Home</a></p></main></body></html>

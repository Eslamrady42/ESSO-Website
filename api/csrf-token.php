<?php
declare(strict_types=1);
require_once __DIR__.'/csrf.php';
json_response(['success'=>true,'csrf_token'=>csrf_token()]);

<?php
declare(strict_types=1);
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/csrf.php';
if($_SERVER['REQUEST_METHOD']!=='POST')fail_json('Method not allowed.',405);
$input=json_decode(file_get_contents('php://input'),true);if(!is_array($input))fail_json('Invalid request.');
if(!csrf_valid($input['csrf_token']??null))fail_json('Invalid security token.',403);
if(!rate_limit('design:'.client_ip(),RATE_LIMIT_DESIGN_MAX,RATE_LIMIT_DESIGN_PERIOD))fail_json('Too many design requests. Please try again later.',429);
$name=clean_string($input['name']??'',120);$email=clean_string($input['email']??'',160);$phone=clean_string($input['phone']??'',60);
$projectType=clean_string($input['project_type']??'',50);$area=clean_string($input['area']??'',30);$floors=clean_string($input['floors']??'',20);$location=clean_string($input['location']??'',160);$notes=clean_string($input['notes']??'',1000);$requirements=clean_array($input['requirements']??[],30);
if($name===''||!valid_email($email)||$phone==='')fail_json('Please provide a valid name, email and phone number.',422);
$analysis=is_array($input['analysis']??null)?$input['analysis']:[];
$subject='ESSO Smart Home Design Request';$body="New Smart Home Design Request\n\nName: {$name}\nEmail: {$email}\nPhone: {$phone}\nProject Type: {$projectType}\nArea: {$area}\nFloors: {$floors}\nLocation: {$location}\nRequirements: ".implode(', ',$requirements)."\nNotes: {$notes}\n\nAI Analysis:\n".json_encode($analysis,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE)."\n";
$headers="From: ".ADMIN_EMAIL."\r\nReply-To: ".ADMIN_EMAIL."\r\nContent-Type: text/plain; charset=UTF-8\r\n";
if(!@mail(ADMIN_EMAIL,$subject,$body,$headers)){audit_log('Design request mail failure for '.$email);fail_json('Your request could not be submitted right now. Please contact ESSO directly.',503);}
json_response(['success'=>true,'message'=>'Design request submitted successfully.']);

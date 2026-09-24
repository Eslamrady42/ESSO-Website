<?php
declare(strict_types=1);
require_once __DIR__.'/functions.php';
require_once __DIR__.'/csrf.php';
if($_SERVER['REQUEST_METHOD']!=='POST')fail_json('Method not allowed.',405);
$in=json_decode(file_get_contents('php://input'),true);if(!is_array($in))fail_json('Invalid request.');
if(!csrf_valid($in['csrf_token']??null))fail_json('Invalid security token.',403);
if(!rate_limit('final:'.client_ip(),RATE_LIMIT_DESIGN_MAX,RATE_LIMIT_DESIGN_PERIOD))fail_json('Too many requests. Please try again later.',429);
$token=strtoupper(clean_string($in['project_token']??'',12));$p=load_project($token);if(!$p)fail_json('Project not found.',404);
$p['status']='conversion_requested';$p['conversion_request_at']=gmdate('c');$p['customer_notes']=clean_string($in['notes']??'',1000);$p['versions'][]=['version'=>count($p['versions'])+1,'at'=>gmdate('c'),'status'=>'conversion_requested'];save_project_record($p);
$subject='ESSO Smart Home Final Design Request - '.$p['token'];$body="Project Token: {$p['token']}\nName: {$p['customer']['name']}\nEmail: {$p['customer']['email']}\nPhone: {$p['customer']['phone']}\nStatus: conversion_requested\nNotes: ".$p['customer_notes']."\n";$headers="From: ".ADMIN_EMAIL."\r\nReply-To: ".$p['customer']['email']."\r\nContent-Type: text/plain; charset=UTF-8\r\n";if(!@mail(ADMIN_EMAIL,$subject,$body,$headers))audit_log('Final request mail failure for '.$p['token']);
json_response(['success'=>true,'message'=>'Request received.','status'=>$p['status']]);

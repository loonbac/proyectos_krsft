<?php

use Illuminate\Support\Facades\Route;

$moduleName = basename(dirname(__DIR__));
$ctrl = "Modulos_ERP\\{$moduleName}\\Controllers\\ProyectoController";

// Projects
Route::get('/list', "{$ctrl}@list");
Route::get('/stats', "{$ctrl}@stats");
Route::get('/supervisors', "{$ctrl}@getSupervisors");
Route::get('/workers', "{$ctrl}@getAllWorkers");
Route::get('/{id}', "{$ctrl}@show")->where('id', '[0-9]+');
Route::post('/create', "{$ctrl}@store");
Route::put('/{id}', "{$ctrl}@update")->where('id', '[0-9]+');
Route::delete('/{id}', "{$ctrl}@destroy")->where('id', '[0-9]+');

// Project workers
Route::post('/{id}/workers', "{$ctrl}@addWorker")->where('id', '[0-9]+');
Route::delete('/{id}/workers/{trabajadorId}', "{$ctrl}@removeWorker")->where(['id' => '[0-9]+', 'trabajadorId' => '[0-9]+']);

// Purchase orders
Route::post('/{id}/order', "{$ctrl}@createPurchaseOrder")->where('id', '[0-9]+');

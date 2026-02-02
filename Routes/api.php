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
Route::post('/orders/{orderId}/approve', "{$ctrl}@approveMaterialOrder")->where('orderId', '[0-9]+');
Route::post('/orders/{orderId}/reject', "{$ctrl}@rejectMaterialOrder")->where('orderId', '[0-9]+');
Route::get('/{id}/paid-orders', "{$ctrl}@getPaidOrders")->where('id', '[0-9]+');
Route::post('/orders/{orderId}/confirm-delivery', "{$ctrl}@confirmDelivery")->where('orderId', '[0-9]+');
Route::post('/confirm-file-delivery', "{$ctrl}@confirmFileDelivery");

// Material import/export
Route::get('/material-template', "{$ctrl}@downloadMaterialTemplate");
Route::post('/{id}/import-materials', "{$ctrl}@importMaterials")->where('id', '[0-9]+');

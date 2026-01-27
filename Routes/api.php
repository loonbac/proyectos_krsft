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
Route::get('/{id}/orders', "{$ctrl}@getProjectOrders")->where('id', '[0-9]+');
Route::post('/{id}/orders/{orderId}/delivered', "{$ctrl}@markOrderDelivered")->where(['id' => '[0-9]+', 'orderId' => '[0-9]+']);
Route::post('/{id}/orders/delivered-all', "{$ctrl}@markAllOrdersDelivered")->where('id', '[0-9]+');

// Material import/export
Route::get('/material-template', "{$ctrl}@downloadMaterialTemplate");
Route::post('/{id}/import-materials', "{$ctrl}@importMaterials")->where('id', '[0-9]+');


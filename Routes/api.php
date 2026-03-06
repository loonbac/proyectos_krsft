<?php

use Illuminate\Support\Facades\Route;

$moduleName = basename(dirname(__DIR__));
$ctrl = "Modulos_ERP\\{$moduleName}\\Controllers\\ProyectoController";
$pipeCtrl = "Modulos_ERP\\{$moduleName}\\Controllers\\PipelineController";

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

// Finalizar proyecto (liberar materiales apartados → disponible)
Route::post('/{id}/finalize', "{$ctrl}@finalizeProject")->where('id', '[0-9]+');

// Completar proyecto con gestión de sobras de materiales
Route::get('/{id}/completion-materials', "{$ctrl}@getCompletionMaterials")->where('id', '[0-9]+');
Route::get('/{id}/completion-request', "{$ctrl}@getCompletionRequest")->where('id', '[0-9]+');
Route::post('/{id}/request-completion', "{$ctrl}@requestCompletion")->where('id', '[0-9]+');
Route::post('/{id}/approve-completion', "{$ctrl}@approveCompletion")->where('id', '[0-9]+');

// ── Pipeline de Pre-Proyecto ────────────────────────────────────────────
Route::prefix('pipeline')->group(function () use ($pipeCtrl) {
    Route::get('/', "{$pipeCtrl}@index");
    Route::get('/stats', "{$pipeCtrl}@stats");
    Route::get('/workers', "{$pipeCtrl}@getWorkers");
    Route::get('/cecos/list', "{$pipeCtrl}@getCecos");
    Route::post('/', "{$pipeCtrl}@store");
    Route::get('/{id}', "{$pipeCtrl}@show")->where('id', '[0-9]+');
    Route::put('/{id}', "{$pipeCtrl}@update")->where('id', '[0-9]+');
    Route::delete('/{id}', "{$pipeCtrl}@destroy")->where('id', '[0-9]+');

    // Cambio de etapa
    Route::post('/{id}/stage', "{$pipeCtrl}@changeStage")->where('id', '[0-9]+');

    // Crear proyecto desde lead (con modal: abreviatura + CECO)
    Route::post('/{id}/create-project', "{$pipeCtrl}@createProjectFromLeadModal")->where('id', '[0-9]+');

    // Equipo
    Route::put('/{id}/team', "{$pipeCtrl}@updateTeam")->where('id', '[0-9]+');

    // Comunicaciones
    Route::post('/{id}/communications', "{$pipeCtrl}@addCommunication")->where('id', '[0-9]+');

    // Visitas
    Route::post('/{id}/visits', "{$pipeCtrl}@addVisit")->where('id', '[0-9]+');
    Route::post('/visits/{visitId}/complete', "{$pipeCtrl}@completeVisit")->where('visitId', '[0-9]+');

    // Presupuestos
    Route::post('/{id}/budgets', "{$pipeCtrl}@addBudget")->where('id', '[0-9]+');
    Route::put('/budgets/{budgetId}/status', "{$pipeCtrl}@updateBudgetStatus")->where('budgetId', '[0-9]+');

    // Negociaciones
    Route::post('/{id}/negotiations', "{$pipeCtrl}@addNegotiation")->where('id', '[0-9]+');

    // Archivos adjuntos
    Route::post('/{id}/files', "{$pipeCtrl}@uploadFiles")->where('id', '[0-9]+');
    Route::get('/files/{fileId}/download', "{$pipeCtrl}@downloadFile")->where('fileId', '[0-9]+');
    Route::delete('/files/{fileId}', "{$pipeCtrl}@deleteFile")->where('fileId', '[0-9]+');
});

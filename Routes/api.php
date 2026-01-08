<?php

use Illuminate\Support\Facades\Route;

$moduleName = basename(dirname(__DIR__));
$ctrl = "Modulos_ERP\\{$moduleName}\\Controllers\\ProyectoController";

// Proyectos
Route::get('/list', "{$ctrl}@list");
Route::get('/stats', "{$ctrl}@stats");
Route::get('/{id}', "{$ctrl}@show")->where('id', '[0-9]+');
Route::post('/create', "{$ctrl}@store");
Route::put('/{id}', "{$ctrl}@update")->where('id', '[0-9]+');
Route::delete('/{id}', "{$ctrl}@destroy")->where('id', '[0-9]+');

// Gastos
Route::get('/{id}/expenses', "{$ctrl}@getExpenses")->where('id', '[0-9]+');
Route::post('/{id}/expense', "{$ctrl}@addExpense")->where('id', '[0-9]+');
Route::delete('/{projectId}/expense/{expenseId}', "{$ctrl}@deleteExpense")
    ->where(['projectId' => '[0-9]+', 'expenseId' => '[0-9]+']);

// Umbral
Route::put('/{id}/threshold', "{$ctrl}@updateThreshold")->where('id', '[0-9]+');

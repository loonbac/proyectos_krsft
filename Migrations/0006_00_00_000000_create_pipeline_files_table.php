<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Archivos adjuntos a leads del pipeline.
 * Almacena documentos, imágenes, planos, presupuestos, etc.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pipeline_files', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('pipeline_id');
            $table->string('original_name');           // nombre original del archivo
            $table->string('stored_name');              // nombre en disco (UUID)
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->default(0); // bytes
            $table->string('category')->default('general'); // general, plano, presupuesto, contrato, foto, otro
            $table->text('description')->nullable();
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->timestamps();

            $table->foreign('pipeline_id')->references('id')->on('project_pipeline')->cascadeOnDelete();
            $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pipeline_files');
    }
};

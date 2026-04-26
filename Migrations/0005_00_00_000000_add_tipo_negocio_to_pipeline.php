<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agrega campo tipo_negocio a la tabla project_pipeline.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_pipeline', function (Blueprint $table) {
            $table->string('tipo_negocio', 150)->nullable()->after('cargo_cliente');
        });
    }

    public function down(): void
    {
        Schema::table('project_pipeline', function (Blueprint $table) {
            $table->dropColumn('tipo_negocio');
        });
    }
};

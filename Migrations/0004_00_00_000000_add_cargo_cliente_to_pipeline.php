<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agrega campos cargo_cliente y tipo_negocio a la tabla project_pipeline.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_pipeline', function (Blueprint $table) {
            $table->string('cargo_cliente', 150)->nullable()->after('cliente_empresa');
            $table->string('tipo_negocio', 150)->nullable()->after('cargo_cliente');
        });
    }

    public function down(): void
    {
        Schema::table('project_pipeline', function (Blueprint $table) {
            $table->dropColumn(['cargo_cliente', 'tipo_negocio']);
        });
    }
};

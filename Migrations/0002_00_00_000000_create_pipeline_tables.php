<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pipeline de Pre-Proyecto — Gestión de etapas previas al inicio de un proyecto.
 * Etapas: ingresado → contactado → visitado → presupuestado → negociacion → cerrado_ganado / cerrado_perdido
 */
return new class extends Migration
{
    public function up(): void
    {
        // Tabla principal del pipeline
        Schema::create('project_pipeline', function (Blueprint $table) {
            $table->id();
            $table->string('nombre_proyecto');
            $table->string('cliente_nombre');
            $table->string('cliente_telefono')->nullable();
            $table->string('cliente_email')->nullable();
            $table->string('cliente_empresa')->nullable();
            $table->text('descripcion')->nullable();
            $table->enum('etapa', [
                'ingresado', 'contactado', 'visitado',
                'presupuestado', 'negociacion',
                'cerrado_ganado', 'cerrado_perdido',
            ])->default('ingresado');
            $table->decimal('presupuesto_estimado', 15, 2)->default(0);
            $table->enum('moneda', ['PEN', 'USD'])->default('PEN');
            $table->string('ubicacion')->nullable();
            $table->text('notas')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('project_id')->nullable(); // Vinculación con proyecto real al cerrar ganado
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
        });

        // Equipo asignado al pipeline (mínimo 2 personas)
        Schema::create('pipeline_team', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('pipeline_id');
            $table->unsignedBigInteger('trabajador_id');
            $table->string('rol')->default('responsable'); // responsable, apoyo, lider
            $table->timestamps();

            $table->unique(['pipeline_id', 'trabajador_id']);
            $table->foreign('pipeline_id')->references('id')->on('project_pipeline')->cascadeOnDelete();
        });

        // Registro de comunicaciones (etapa contactado)
        Schema::create('pipeline_communications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('pipeline_id');
            $table->enum('tipo', ['llamada', 'email', 'whatsapp', 'presencial', 'otro'])->default('llamada');
            $table->text('resumen');
            $table->boolean('contacto_exitoso')->default(false);
            $table->string('contacto_nombre')->nullable();
            $table->unsignedBigInteger('realizado_por')->nullable();
            $table->timestamp('fecha_comunicacion')->nullable();
            $table->timestamps();

            $table->foreign('pipeline_id')->references('id')->on('project_pipeline')->cascadeOnDelete();
        });

        // Programación de visitas (etapa visitado)
        Schema::create('pipeline_visits', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('pipeline_id');
            $table->timestamp('fecha_programada');
            $table->timestamp('fecha_realizada')->nullable();
            $table->string('direccion')->nullable();
            $table->text('observaciones')->nullable();
            $table->enum('estado', ['programada', 'completada', 'cancelada', 'reprogramada'])->default('programada');
            $table->unsignedBigInteger('asignado_a')->nullable(); // trabajador_id
            $table->json('fotos')->nullable(); // rutas de fotos tomadas
            $table->timestamps();

            $table->foreign('pipeline_id')->references('id')->on('project_pipeline')->cascadeOnDelete();
        });

        // Presupuestos generados (etapa presupuestado)
        Schema::create('pipeline_budgets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('pipeline_id');
            $table->integer('version')->default(1);
            $table->decimal('monto_base', 15, 2)->default(0);
            $table->boolean('igv_incluido')->default(true);
            $table->decimal('igv_rate', 5, 2)->default(18.00);
            $table->decimal('monto_total', 15, 2)->default(0);
            $table->text('detalle')->nullable(); // Descripción del alcance
            $table->json('partidas')->nullable(); // Array de partidas [{nombre, monto}]
            $table->enum('estado', ['borrador', 'enviado', 'aceptado', 'rechazado'])->default('borrador');
            $table->timestamp('enviado_at')->nullable();
            $table->unsignedBigInteger('creado_por')->nullable();
            $table->timestamps();

            $table->foreign('pipeline_id')->references('id')->on('project_pipeline')->cascadeOnDelete();
        });

        // Seguimiento de negociación
        Schema::create('pipeline_negotiations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('pipeline_id');
            $table->text('nota');
            $table->enum('tipo', ['observacion', 'contraoferta', 'acuerdo', 'rechazo', 'otro'])->default('observacion');
            $table->decimal('monto_propuesto', 15, 2)->nullable();
            $table->unsignedBigInteger('registrado_por')->nullable();
            $table->timestamps();

            $table->foreign('pipeline_id')->references('id')->on('project_pipeline')->cascadeOnDelete();
        });

        // Historial de cambios de etapa
        Schema::create('pipeline_stage_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('pipeline_id');
            $table->string('etapa_anterior');
            $table->string('etapa_nueva');
            $table->text('motivo')->nullable();
            $table->unsignedBigInteger('cambiado_por')->nullable();
            $table->timestamps();

            $table->foreign('pipeline_id')->references('id')->on('project_pipeline')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pipeline_stage_history');
        Schema::dropIfExists('pipeline_negotiations');
        Schema::dropIfExists('pipeline_budgets');
        Schema::dropIfExists('pipeline_visits');
        Schema::dropIfExists('pipeline_communications');
        Schema::dropIfExists('pipeline_team');
        Schema::dropIfExists('project_pipeline');
    }
};

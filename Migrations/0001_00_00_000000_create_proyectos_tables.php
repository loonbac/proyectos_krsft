<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migración consolidada del Módulo de Proyectos (proyectoskrsft)
 * Consolidó 4 archivos de migración relacionadas con proyectos
 * Generada: 2026-02-19
 * 
 * Nota: Las migraciones de purchase_orders se consolidaron en compraskrsft
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Tabla: projects
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            
            // Currency fields (agregados 2024-01-13)
            $table->enum('currency', ['PEN', 'USD'])->default('PEN');
            
            // Financial fields
            $table->decimal('base_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('retained_amount', 15, 2)->default(0);
            $table->decimal('available_amount', 15, 2)->default(0);
            $table->integer('spending_threshold')->default(75);
            
            // IGV fields (agregados 2024-01-13)
            $table->boolean('igv_enabled')->default(true);
            $table->decimal('igv_rate', 5, 2)->default(18.00);
            
            // User relationships
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('supervisor_id')->nullable(); // Agregado 2024-01-13
            
            // Status
            $table->enum('status', ['active', 'completed', 'paused', 'cancelled'])->default('active');
            
            $table->timestamps();
        });

        // Tabla: project_expenses
        Schema::create('project_expenses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->string('description');
            $table->decimal('amount', 15, 2);
            $table->string('category')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamps();
            
            $table->foreign('project_id')
                  ->references('id')
                  ->on('projects')
                  ->onDelete('cascade');
        });

        // Tabla: project_workers (relación muchos a muchos: proyectos-trabajadores)
        Schema::create('project_workers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('trabajador_id');
            $table->timestamps();
            
            $table->unique(['project_id', 'trabajador_id']);
            
            $table->foreign('project_id')
                  ->references('id')
                  ->on('projects')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_workers');
        Schema::dropIfExists('project_expenses');
        Schema::dropIfExists('projects');
    }
};

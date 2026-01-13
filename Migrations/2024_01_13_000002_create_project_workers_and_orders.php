<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Create project_workers table for workers assigned to projects
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

        // Create purchase_orders table if not exists
        if (!Schema::hasTable('purchase_orders')) {
            Schema::create('purchase_orders', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('project_id');
                $table->enum('type', ['service', 'material'])->default('material');
                $table->string('description');
                $table->json('materials')->nullable();
                $table->decimal('amount', 15, 2)->nullable();
                $table->enum('currency', ['PEN', 'USD'])->default('PEN');
                $table->decimal('exchange_rate', 10, 4)->nullable();
                $table->decimal('amount_pen', 15, 2)->nullable();
                $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
                $table->unsignedBigInteger('created_by')->nullable();
                $table->unsignedBigInteger('approved_by')->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
                
                $table->foreign('project_id')
                      ->references('id')
                      ->on('projects')
                      ->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('project_workers');
        Schema::dropIfExists('purchase_orders');
    }
};

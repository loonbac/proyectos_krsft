<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Columnas de recepción de material en purchase_orders ──
        if (!Schema::hasColumn('purchase_orders', 'material_arrived')) {
            Schema::table('purchase_orders', function (Blueprint $table) {
                $table->boolean('material_arrived')->default(false)->after('delivery_confirmed_by');
                $table->timestamp('material_arrived_at')->nullable()->after('material_arrived');
                $table->unsignedBigInteger('material_arrived_by')->nullable()->after('material_arrived_at');
            });
        }

        // ── Reportes de materiales faltantes (supervisor → inventario) ──
        if (!Schema::hasTable('material_arrival_reports')) {
            Schema::create('material_arrival_reports', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('project_id');
                $table->unsignedBigInteger('reported_by');
                $table->string('reported_by_name', 255);
                $table->text('notas_supervisor');
                $table->enum('status', ['pendiente', 'respondido', 'resuelto'])->default('pendiente');
                $table->text('respuesta')->nullable();
                $table->unsignedBigInteger('respondido_por')->nullable();
                $table->string('respondido_por_name', 255)->nullable();
                $table->timestamp('respondido_at')->nullable();
                $table->unsignedBigInteger('resuelto_por')->nullable();
                $table->string('resuelto_por_name', 255)->nullable();
                $table->timestamp('resuelto_at')->nullable();
                $table->timestamps();

                $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
                $table->index(['project_id', 'status']);
                $table->index('status');
            });
        }

        // ── Ítems individuales de cada reporte ──
        if (!Schema::hasTable('material_arrival_report_items')) {
            Schema::create('material_arrival_report_items', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('report_id');
                $table->unsignedBigInteger('purchase_order_id');
                $table->string('description', 255);
                $table->unsignedInteger('quantity')->default(1);
                $table->string('material_type', 100)->nullable();
                $table->string('unit', 20)->nullable();
                $table->timestamps();

                $table->foreign('report_id')->references('id')->on('material_arrival_reports')->cascadeOnDelete();
                $table->foreign('purchase_order_id')->references('id')->on('purchase_orders')->cascadeOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('material_arrival_report_items');
        Schema::dropIfExists('material_arrival_reports');

        if (Schema::hasColumn('purchase_orders', 'material_arrived')) {
            Schema::table('purchase_orders', function (Blueprint $table) {
                $table->dropColumn(['material_arrived', 'material_arrived_at', 'material_arrived_by']);
            });
        }
    }
};

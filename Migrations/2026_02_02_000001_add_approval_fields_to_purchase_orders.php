<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Agrega campos de aprobación por supervisor y jefe de proyectos
     */
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            // Supervisor approval (quien creó el material)
            $table->boolean('supervisor_approved')->default(false)->after('status');
            $table->unsignedBigInteger('supervisor_approved_by')->nullable()->after('supervisor_approved');
            $table->timestamp('supervisor_approved_at')->nullable()->after('supervisor_approved_by');
            
            // Manager approval (jefe de proyectos aprueba antes de enviar a Compras)
            $table->boolean('manager_approved')->default(false)->after('supervisor_approved_at');
            $table->unsignedBigInteger('manager_approved_by')->nullable()->after('manager_approved');
            $table->timestamp('manager_approved_at')->nullable()->after('manager_approved_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropColumn([
                'supervisor_approved',
                'supervisor_approved_by',
                'supervisor_approved_at',
                'manager_approved',
                'manager_approved_by',
                'manager_approved_at',
            ]);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Agregamos campos para abreviatura del proyecto y relación con CECOs
     */
    public function up(): void
    {
        if (!Schema::hasTable('projects')) {
            return;
        }

        Schema::table('projects', function (Blueprint $table) {
            // Abreviatura del proyecto (ej: PROJ-001, CEC-001)
            if (!Schema::hasColumn('projects', 'abbreviation')) {
                $table->string('abbreviation')->nullable()->after('name')->unique();
            }

            // Relación con CECOs (para trackin presupuestario)
            if (!Schema::hasColumn('projects', 'ceco_id')) {
                $table->unsignedBigInteger('ceco_id')->nullable()->after('abbreviation');
                // Nota: No agregamos foreign key ya que la tabla cecos está en otro módulo
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('projects')) {
            Schema::table('projects', function (Blueprint $table) {
                if (Schema::hasColumn('projects', 'abbreviation')) {
                    $table->dropUnique(['abbreviation']);
                    $table->dropColumn('abbreviation');
                }
                if (Schema::hasColumn('projects', 'ceco_id')) {
                    $table->dropColumn('ceco_id');
                }
            });
        }
    }
};

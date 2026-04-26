<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('projects')) {
            return;
        }

        Schema::table('projects', function (Blueprint $table) {
            if (!Schema::hasColumn('projects', 'supervisor_pdr_id')) {
                $table->unsignedBigInteger('supervisor_pdr_id')->nullable()->after('supervisor_id');
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('projects')) {
            Schema::table('projects', function (Blueprint $table) {
                if (Schema::hasColumn('projects', 'supervisor_pdr_id')) {
                    $table->dropColumn('supervisor_pdr_id');
                }
            });
        }
    }
};

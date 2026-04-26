<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_planner_stages', function (Blueprint $table) {
            $table->json('tracking')->nullable()->after('end_date');
        });
    }

    public function down(): void
    {
        Schema::table('project_planner_stages', function (Blueprint $table) {
            $table->dropColumn('tracking');
        });
    }
};

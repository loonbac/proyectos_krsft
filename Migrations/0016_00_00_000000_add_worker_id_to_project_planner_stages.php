<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('project_planner_stages', function (Blueprint $table) {
            $table->unsignedBigInteger('worker_id')->nullable()->after('name');
            // Assuming trabajadores table exists and holds workers
            $table->foreign('worker_id')->references('id')->on('trabajadores')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_planner_stages', function (Blueprint $table) {
            $table->dropForeign(['worker_id']);
            $table->dropColumn('worker_id');
        });
    }
};

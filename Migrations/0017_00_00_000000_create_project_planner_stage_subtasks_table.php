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
        Schema::create('project_planner_stage_subtasks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('stage_id');
            $table->string('name', 255);
            $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->timestamps();
            
            $table->foreign('stage_id')->references('id')->on('project_planner_stages')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_planner_stage_subtasks');
    }
};

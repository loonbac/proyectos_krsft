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
        Schema::create('project_planner_stages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_planner_id');
            $table->string('name', 255);
            $table->integer('days');
            $table->integer('color_index')->default(0);
            $table->integer('sort_order');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->timestamps();
            
            $table->foreign('project_planner_id')->references('id')->on('project_planners')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_planner_stages');
    }
};

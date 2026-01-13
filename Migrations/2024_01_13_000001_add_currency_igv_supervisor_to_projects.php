<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->enum('currency', ['PEN', 'USD'])->default('PEN')->after('name');
            $table->boolean('igv_enabled')->default(true)->after('spending_threshold');
            $table->decimal('igv_rate', 5, 2)->default(18.00)->after('igv_enabled');
            $table->unsignedBigInteger('supervisor_id')->nullable()->after('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['currency', 'igv_enabled', 'igv_rate', 'supervisor_id']);
        });
    }
};

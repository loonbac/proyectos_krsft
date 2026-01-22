<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->string('unit', 20)->nullable()->after('description');
            $table->string('diameter', 50)->nullable()->after('unit');
            $table->string('series', 100)->nullable()->after('diameter');
            $table->string('material_type', 100)->nullable()->after('series');
            $table->string('manufacturing_standard', 100)->nullable()->after('material_type');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropColumn(['unit', 'diameter', 'series', 'material_type', 'manufacturing_standard']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Agrega estado 'draft' a purchase_orders status enum
     */
    public function up(): void
    {
        // Usar ALTER TABLE directo para modificar ENUM
        DB::statement("ALTER TABLE purchase_orders MODIFY COLUMN status ENUM('draft', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'draft'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE purchase_orders MODIFY COLUMN status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending'");
    }
};

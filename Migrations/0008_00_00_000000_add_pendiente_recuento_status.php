<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE projects MODIFY COLUMN status ENUM('active', 'completed', 'paused', 'cancelled', 'pendiente_recuento') DEFAULT 'active'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE projects MODIFY COLUMN status ENUM('active', 'completed', 'paused', 'cancelled') DEFAULT 'active'");
    }
};

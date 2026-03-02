<?php

namespace Modulos_ERP\ProyectosKrsft\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $table = 'projects';

    protected $fillable = [
        'name',
        'base_amount',
        'total_amount',
        'retained_amount',
        'available_amount',
        'spending_threshold',
        'user_id',
        'status'
    ];

    protected $casts = [
        'base_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'retained_amount' => 'decimal:2',
        'available_amount' => 'decimal:2',
        'spending_threshold' => 'integer'
    ];

    public function expenses()
    {
        return $this->hasMany(ProjectExpense::class, 'project_id');
    }

    public function getSpentAttribute()
    {
        return $this->expenses()->sum('amount');
    }

    public function getRemainingAttribute()
    {
        return $this->available_amount - $this->spent;
    }

    public function getUsagePercentAttribute()
    {
        if ($this->available_amount <= 0) return 0;
        return ($this->spent / $this->available_amount) * 100;
    }

    public function getStatusLabelAttribute()
    {
        $usage = $this->usage_percent;
        $threshold = $this->spending_threshold;
        
        if ($usage >= 90) return 'critical';
        if ($usage >= $threshold) return 'warning';
        return 'good';
    }

    /**
     * Órdenes de compra del proyecto.
     */
    public function purchaseOrders()
    {
        return $this->hasMany(\Modulos_ERP\ComprasKrsft\Models\PurchaseOrder::class, 'project_id');
    }

    /**
     * Materiales de inventario apartados para este proyecto.
     */
    public function reservedMaterials()
    {
        return $this->hasMany(\Modulos_ERP\InventarioKrsft\Models\Producto::class, 'project_id')
            ->where('apartado', true);
    }

    /**
     * Reservas de inventario activas.
     */
    public function inventoryReservations()
    {
        return $this->hasMany(\Modulos_ERP\ComprasKrsft\Models\InventoryReservation::class, 'project_id');
    }

    /**
     * ¿Se puede finalizar el proyecto?
     */
    public function getCanFinalizeAttribute(): bool
    {
        return $this->status === 'active';
    }
}

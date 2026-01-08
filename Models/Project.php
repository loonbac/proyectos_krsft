<?php

namespace Modulos_ERP\proyectos_krsft\Models;

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
}

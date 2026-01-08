<?php

namespace Modulos_ERP\proyectos_krsft\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectExpense extends Model
{
    protected $table = 'project_expenses';

    protected $fillable = [
        'project_id',
        'description',
        'amount',
        'category',
        'notes',
        'user_id'
    ];

    protected $casts = [
        'amount' => 'decimal:2'
    ];

    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }
}

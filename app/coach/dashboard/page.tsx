'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getAthletes, getPlans, saveAthletes } from '@/lib/db'
import { Athlete, TrainingPlan } from '@/lib/types'

export default function CoachDashboard() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [mounted, setMounted] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  useEffect(() => {
    setAthletes(getAthletes())
    setPlans(getPlans())
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="p-4 sm:p-8 lg:p-10 max-w-7xl animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-12"></div>
        <div className="flex gap-10 mb-12">
          <div className="h-16 bg-gray-200 rounded w-24"></div>
          <div className="h-16 bg-gray-200 rounded w-24"></div>
          <div className="h-16 bg-gray-200 rounded w-24"></div>
          <div className="h-16 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="h-96 bg-gray-200 rounded-2xl"></div>
      </div>
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(today.getDate() + 7)
  sevenDaysFromNow.setHours(23, 59, 59, 999)

  const activePlans = plans.filter(p => new Date(p.endDate) >= today)
  
  const expiringSoonPlans = plans.filter(p => {
    const endDate = new Date(p.endDate)
    return endDate >= today && endDate <= sevenDaysFromNow
  })

  // Gender counters
  const menCount = athletes.filter(a => a.gender === 'hombre').length
  const womenCount = athletes.filter(a => a.gender === 'mujer').length

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    setDraggedId(id)
  }

  const handleDragOver = (e: React.DragEvent, colStatus: string) => {
    e.preventDefault()
    setDragOverColumn(colStatus)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent, targetStatus: 'por_trabajar' | 'trabajando' | 'activo') => {
    e.preventDefault()
    setDragOverColumn(null)
    const id = e.dataTransfer.getData('text/plain') || draggedId
    if (!id) return

    const updated = athletes.map(a => {
      if (a.id === id) {
        return { ...a, status: targetStatus }
      }
      return a
    })

    setAthletes(updated)
    saveAthletes(updated)
    setDraggedId(null)
  }

  // Filter athletes by column status
  const getColAthletes = (status: 'por_trabajar' | 'trabajando' | 'activo') => {
    // If an athlete doesn't have status, default to 'por_trabajar'
    return athletes.filter(a => {
      const s = a.status || 'por_trabajar';
      return s === status;
    })
  }

  const columnsList: { id: 'por_trabajar' | 'trabajando' | 'activo'; title: string; color: string; bg: string }[] = [
    { id: 'por_trabajar', title: 'Plan por trabajar', color: '#4A4F57', bg: '#F5F5F6' },
    { id: 'trabajando', title: 'Trabajando', color: '#E25C3E', bg: 'rgba(226, 92, 62, 0.04)' },
    { id: 'activo', title: 'Plan activo', color: '#047857', bg: 'rgba(4, 120, 87, 0.04)' }
  ]

  return (
    <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto">

      {/* Header — eyebrow + display heading */}
      <div className="flex items-end justify-between mb-12 animate-fade-up">
        <div>
          <p className="eyebrow mb-2">Panel · Temporada 2026</p>
          <h1
            className="text-4xl font-bold"
            style={{ color: '#1C1F23', letterSpacing: '-0.03em', lineHeight: 1.1 }}
          >
            Mis atletas
          </h1>
        </div>
        <Link
          href="/coach/athletes/new"
          className="btn-primary"
        >
          <span>+ Nuevo atleta</span>
        </Link>
      </div>

      {/* Stats — grandes números editoriales */}
      <div className="flex flex-wrap gap-8 mb-12 animate-fade-up delay-1">
        {[
          { value: athletes.length, label: 'Atletas' },
          { value: menCount, label: 'Hombres' },
          { value: womenCount, label: 'Mujeres' },
          { value: activePlans.length, label: 'Planes activos' },
          { value: plans.length, label: 'Planes totales' },
          { 
            value: expiringSoonPlans.length, 
            label: 'Por vencer (7d)', 
            color: expiringSoonPlans.length > 0 ? '#E25C3E' : '#1C1F23' 
          },
        ].map(stat => (
          <div key={stat.label} className="min-w-[120px] bg-white border border-[#E8E9EB] p-5 rounded-2xl flex-1 shadow-sm">
            <p
              className="font-bold"
              style={{ 
                fontSize: '2.5rem', 
                lineHeight: 1, 
                color: stat.color || '#1C1F23', 
                letterSpacing: '-0.04em' 
              }}
            >
              {stat.value}
            </p>
            <p className="eyebrow mt-2" style={{ color: stat.color ? stat.color : '#7A7E85' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Kanban Board Columns */}
      {athletes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E9EB] animate-fade-up delay-2">
          <p className="text-sm text-[#7A7E85] mb-4">No tienes atletas registrados todavía.</p>
          <Link href="/coach/athletes/new" className="btn-primary inline-flex">
            <span>Registrar primer atleta</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-up delay-2">
          {columnsList.map(column => {
            const colAthletes = getColAthletes(column.id)
            const isOver = dragOverColumn === column.id

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
                className="rounded-2xl p-4 transition-all duration-200 flex flex-col min-h-[500px]"
                style={{
                  background: isOver ? 'rgba(168,255,0,0.03)' : '#FFFFFF',
                  border: isOver ? '2px dashed #A8FF00' : '1px solid #E8E9EB',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.01)'
                }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E9EB]">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ background: column.color }}
                    />
                    <h2 className="font-bold text-[#1C1F23] text-sm tracking-tight">
                      {column.title}
                    </h2>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-bold text-gray-400 bg-gray-100">
                    {colAthletes.length}
                  </span>
                </div>

                {/* Dropzone description if empty */}
                {colAthletes.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl py-12 text-center">
                    <span className="text-xl mb-1 text-gray-300">⬇️</span>
                    <p className="text-xs text-gray-400">Arrastra tarjetas aquí</p>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1">
                    {colAthletes.map(athlete => {
                      const athletePlans = plans.filter(p => p.athleteId === athlete.id)
                      const activePlan = athletePlans.find(p => new Date(p.endDate) >= today)
                      const initials = athlete.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

                      return (
                        <div
                          key={athlete.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, athlete.id)}
                          className="bg-white border border-[#E8E9EB] hover:border-[#D5D8DD] hover:shadow-md transition-all duration-150 p-5 rounded-xl cursor-grab active:cursor-grabbing group block"
                        >
                          <Link href={`/coach/athletes/${athlete.id}`}>
                            {/* Header row */}
                            <div className="flex items-center justify-between mb-3.5">
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                                style={{ background: '#F5F5F6', color: '#4A4F57' }}
                              >
                                {initials}
                              </div>
                              <span className="text-[10px] text-gray-400 font-semibold uppercase">
                                {athlete.sport}
                              </span>
                            </div>

                            {/* Athlete name */}
                            <h3 className="font-bold text-[#1C1F23] text-sm group-hover:text-black leading-tight mb-1">
                              {athlete.name}
                            </h3>
                            <p className="text-xs text-[#7A7E85] mb-3">
                              {athlete.age} años {athlete.gender === 'mujer' ? '· Femenino' : '· Masculino'}
                            </p>

                            {/* Goal brief */}
                            <p className="text-xs text-[#4A4F57] line-clamp-2 leading-relaxed mb-4">
                              {athlete.goal || 'Sin objetivo deportivo cargado'}
                            </p>

                            {/* Footer stats summary */}
                            <div className="pt-3 border-t border-[#F5F5F6] flex items-center justify-between text-[10px] eyebrow text-[#7A7E85]">
                              <span>{athletePlans.length} plan{athletePlans.length !== 1 ? 'es' : ''}</span>
                              <span className="font-bold text-[#1C1F23] group-hover:underline">Perfil →</span>
                            </div>
                          </Link>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

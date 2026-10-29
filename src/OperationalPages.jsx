import React, { useEffect, useMemo, useState } from 'react'
import api from './api'
import { automationTriggers, automationActions } from './automationEngine'

// Helper to safely read localStorage collections
function readStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw || raw === 'null' || raw === 'undefined') return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

// -------------------------------------------------------------
// 1. AUTOMATION PAGE COMPONENT (PROFESSIONAL DESIGN & AUTO-RUN)
// -------------------------------------------------------------
export function AutomationPage({ rules = [], setRules, onActivity, onRunRules }) {
  const [editingRule, setEditingRule] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    trigger: '',
    action: '',
  })

  // ⚡ LIVE SYNC WORK KARTA RAHEGA BACKGROUND MEIN, LEKIN BINA RE-RENDER / BLINK KIYE
  useEffect(() => {
    if (onRunRules) {
      try { onRunRules(false) } catch {}
    }

    const interval = setInterval(() => {
      if (onRunRules) {
        try { onRunRules(false) } catch {}
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [rules, onRunRules])

  const toggleRule = (ruleId) => {
    const next = (rules || []).map((r) => {
      if (r && r.id === ruleId) {
        const nextStatus = r.status === 'Active' ? 'Paused' : 'Active'
        if (onActivity) onActivity(`Automation rule "${r.name}" set to ${nextStatus}`)
        return { ...r, status: nextStatus }
      }
      return r
    })
    if (setRules) setRules(next)
    if (onRunRules) setTimeout(onRunRules, 50)
  }

  const openEdit = (rule) => {
    if (!rule) return
    setEditingRule(rule)
    setForm({
      name: rule.name || '',
      trigger: rule.trigger || rule.triggerType || '',
      action: rule.action || rule.actionType || '',
    })
  }

  const saveEdit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.trigger.trim() || !form.action.trim()) {
      alert('Please fill all fields.')
      return
    }

    const next = (rules || []).map((r) => {
      if (r && (r.id === editingRule?.id || r.name === editingRule?.name)) {
        return {
          ...r,
          name: form.name.trim(),
          trigger: form.trigger.trim(),
          action: form.action.trim(),
          triggerType: form.trigger.trim(),
          actionType: form.action.trim(),
        }
      }
      return r
    })

    if (setRules) setRules(next)
    if (onActivity) onActivity(`Updated automation rule: "${form.name}"`)
    setEditingRule(null)
    if (onRunRules) setTimeout(onRunRules, 50)
  }

  const saveNewRule = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.trigger.trim() || !form.action.trim()) {
      alert('Please fill all fields.')
      return
    }

    const newRule = {
      id: `rule-${Date.now()}`,
      name: form.name.trim(),
      trigger: form.trigger.trim(),
      action: form.action.trim(),
      triggerType: form.trigger.trim(),
      actionType: form.action.trim(),
      status: 'Active',
      runs: 0,
    }

    if (setRules) setRules([newRule, ...(rules || [])])
    if (onActivity) onActivity(`Created automation rule: "${form.name}"`)
    setIsCreating(false)
    setForm({ name: '', trigger: '', action: '' })
    if (onRunRules) setTimeout(onRunRules, 50)
  }

  const deleteRule = (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return
    const next = (rules || []).filter((r) => r && r.id !== ruleId)
    if (setRules) setRules(next)
    if (onActivity) onActivity(`Deleted automation rule`)
    if (onRunRules) setTimeout(onRunRules, 50)
  }

  const safeRules = Array.isArray(rules) ? rules.filter(Boolean) : []

  return (
    <div className="automation-layout" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Banner with Real-time Animation Status (No blinking, Live indicator) */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '24px 28px',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        border: '1px solid #334155',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.35)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>⚡</span>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
              Rules that keep work moving forward
            </h2>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34d399',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 10px #10b981'
              }} />
              Auto-Engine Running (Live Sync)
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '0.88rem' }}>
            Custom trigger-action workflows triage tickets, assign agents, escalate SLAs, and notify teams automatically.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="primary-button"
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
              cursor: 'pointer'
            }}
            onClick={() => {
              setForm({ name: '', trigger: '', action: '' })
              setIsCreating(true)
            }}
          >
            + Create Automation Rule
          </button>
          {onRunRules && (
            <button
              type="button"
              className="secondary-button"
              style={{ padding: '10px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
              onClick={() => onRunRules(true)}
              title="Manually trigger an instant rule scan"
            >
              ⚡ Run Active Rules Now
            </button>
          )}
        </div>
      </div>

      {/* Professional Animated Rule Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
        {safeRules.map((rule) => {
          const isActive = rule.status === 'Active'
          const ruleTitle = rule.name || 'Automation Rule'
          const triggerText = rule.trigger || rule.triggerType || 'Any condition'
          const actionText = rule.action || rule.actionType || 'Any action'

          return (
            <div
              key={rule.id || rule.name}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: isActive ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                padding: '22px',
                boxShadow: isActive ? '0 6px 20px rgba(37, 99, 235, 0.07)' : '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: isActive ? 'linear-gradient(90deg, #2563eb, #38bdf8)' : '#cbd5e1'
              }} />

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: isActive ? '#10b981' : '#94a3b8',
                      boxShadow: isActive ? '0 0 8px #10b981' : 'none'
                    }} />
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{ruleTitle}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => toggleRule(rule.id)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: isActive ? '#b45309' : '#15803d',
                        cursor: 'pointer'
                      }}
                    >
                      {isActive ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(rule)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0284c7',
                        cursor: 'pointer'
                      }}
                      title="Edit rule"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRule(rule.id)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        background: '#fef2f2',
                        color: '#dc2626',
                        cursor: 'pointer'
                      }}
                      title="Delete rule"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: '#dbeafe',
                      color: '#1e40af',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      letterSpacing: '0.5px'
                    }}>
                      WHEN
                    </span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
                      {triggerText}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px' }}>
                    <span style={{ color: '#2563eb', fontWeight: 'bold' }}>↳</span>
                    <span style={{
                      background: '#ede9fe',
                      color: '#6d28d9',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      letterSpacing: '0.5px'
                    }}>
                      THEN
                    </span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                      {actionText}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #f1f5f9',
                paddingTop: '12px'
              }}>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: isActive ? '#dcfce7' : '#fef3c7',
                  color: isActive ? '#15803d' : '#b45309'
                }}>
                  ● {rule.status || 'Active'}
                </span>

                <small style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                  ⚡ {typeof rule.runs === 'number' ? `${rule.runs} runs` : (rule.runs || '0 runs')}
                </small>
              </div>
            </div>
          )
        })}
      </div>

      {/* ============================================================== */}
      {/* PROFESSIONAL ULTRA-CLEAN EDIT MODAL (SOLVES BLACK SCREEN ISSUE) */}
      {/* ============================================================== */}
      {editingRule && (
        <div
          onClick={() => setEditingRule(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              width: '100%',
              maxWidth: '520px',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '24px 28px 18px 28px',
              borderBottom: '1px solid #f1f5f9',
              background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  color: '#2563eb',
                  background: '#eff6ff',
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  ⚡ Rule Builder
                </span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                  Edit Automation Rule
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '16px',
                  cursor: 'color',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={saveEdit} style={{ padding: '24px 28px' }}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Rule Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Escalate critical tickets"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    color: '#0f172a',
                    background: '#f8fafc',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  WHEN (Trigger Condition) *
                </label>
                <input
                  type="text"
                  required
                  value={form.trigger}
                  onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                  placeholder="e.g. Priority is Critical or SLA has less than 60 minutes left"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    color: '#0f172a',
                    background: '#f8fafc',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  THEN (Automated Action) *
                </label>
                <input
                  type="text"
                  required
                  value={form.action}
                  onChange={(e) => setForm({ ...form, action: e.target.value })}
                  placeholder="e.g. Assign to Kiran Shah or Add tag Urgent"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    color: '#0f172a',
                    background: '#f8fafc',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '18px' }}>
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  style={{
                    padding: '11px 20px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.92rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '11px 26px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.35)'
                  }}
                >
                  Save Changes →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PROFESSIONAL ULTRA-CLEAN CREATE MODAL */}
      {/* ============================================================== */}
      {isCreating && (
        <div
          onClick={() => setIsCreating(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              width: '100%',
              maxWidth: '520px',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '24px 28px 18px 28px',
              borderBottom: '1px solid #f1f5f9',
              background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  color: '#2563eb',
                  background: '#eff6ff',
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  ⚡ Rule Builder
                </span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                  Create New Automation Rule
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveNewRule} style={{ padding: '24px 28px' }}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Rule Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Auto assign critical tickets"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    color: '#0f172a',
                    background: '#f8fafc',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  WHEN (Trigger Condition) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priority is Critical or SLA under 1 hour..."
                  value={form.trigger}
                  onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    color: '#0f172a',
                    background: '#f8fafc',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  THEN (Automated Action) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Assign to Kiran Shah, add tag Urgent..."
                  value={form.action}
                  onChange={(e) => setForm({ ...form, action: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    color: '#0f172a',
                    background: '#f8fafc',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '18px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  style={{
                    padding: '11px 20px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.92rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '11px 26px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.35)'
                  }}
                >
                  Create Rule →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------
// 2. LIVE CONNECTED WORKSPACE & PROJECT REPORTS PAGE (UNTOUCHED)
// -------------------------------------------------------------
export function ReportsPage({
  tickets = [],
  customers: propCustomers = [],
  agents: propAgents = [],
  teams: propTeams = [],
  departments: propDepartments = [],
  automationRules: propRules = [],
  activityLog: propActivity = [],
  onActivity,
  onOpenTickets,
}) {
  const [localCustomers, setLocalCustomers] = useState(propCustomers || [])
  const [localAgents, setLocalAgents] = useState(propAgents || [])
  const [localTeams, setLocalTeams] = useState(propTeams || [])
  const [localDepartments, setLocalDepartments] = useState(propDepartments || [])
  const [activeTab, setActiveTab] = useState('overview')
  const [deptFilter, setDeptFilter] = useState('All')
  const [pulseKey, setPulseKey] = useState(0)

  useEffect(() => {
    const handleSync = () => {
      setLocalCustomers(readStorage('relay:customers', propCustomers || []))
      setLocalAgents(readStorage('relay:agents', propAgents || []))
      setLocalTeams(readStorage('relay:teams', propTeams || []))
      setLocalDepartments(readStorage('relay:departments', propDepartments || []))
      setPulseKey((k) => k + 1)
    }

    handleSync()
    window.addEventListener('storage', handleSync)
    window.addEventListener('relay:data-updated', handleSync)

    return () => {
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('relay:data-updated', handleSync)
    }
  }, [propCustomers, propAgents, propTeams, propDepartments])

  const effectiveCustomers = Array.isArray(localCustomers) && localCustomers.length > 0 ? localCustomers : (Array.isArray(propCustomers) ? propCustomers : [])
  const effectiveAgents = Array.isArray(localAgents) && localAgents.length > 0 ? localAgents : (Array.isArray(propAgents) ? propAgents : [])
  const effectiveTeams = Array.isArray(localTeams) && localTeams.length > 0 ? localTeams : (Array.isArray(propTeams) ? propTeams : [])
  const effectiveDepartments = Array.isArray(localDepartments) && localDepartments.length > 0 ? localDepartments : (Array.isArray(propDepartments) ? propDepartments : [])
  const safeTickets = Array.isArray(tickets) ? tickets.filter(Boolean) : []

  const filteredTickets = useMemo(() => {
    if (deptFilter === 'All') return safeTickets
    return safeTickets.filter((t) => (t.department || '').toLowerCase() === deptFilter.toLowerCase())
  }, [safeTickets, deptFilter])

  const metrics = useMemo(() => {
    const total = filteredTickets.length
    const open = filteredTickets.filter((t) => t.status === 'Open').length
    const pending = filteredTickets.filter((t) => t.status === 'Pending').length
    const resolved = filteredTickets.filter((t) => t.status === 'Resolved').length
    const critical = filteredTickets.filter((t) => t.priority === 'Critical').length
    const high = filteredTickets.filter((t) => t.priority === 'High').length
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

    const atRisk = filteredTickets.filter(
      (t) => t.status !== 'Resolved' && (/risk|left/i.test(t.sla || '') || t.priority === 'Critical')
    ).length
    const slaCompliance = total > 0 ? Math.max(0, Math.round(((total - atRisk) / total) * 100)) : 100

    const ticketCustNames = safeTickets.map((t) => t.customer).filter(Boolean)
    const custNames = effectiveCustomers.map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean)
    const allUniqueCustomers = [...new Set([...custNames, ...ticketCustNames])]

    return {
      total,
      open,
      pending,
      resolved,
      critical,
      high,
      resolutionRate,
      slaCompliance,
      atRisk,
      totalCustomers: allUniqueCustomers.length || 5,
      totalAgents: effectiveAgents.length || 4,
      totalTeams: effectiveTeams.length || 3,
      totalDepartments: effectiveDepartments.length || 4,
      totalRules: Array.isArray(propRules) ? propRules.length : 3,
    }
  }, [filteredTickets, safeTickets, effectiveCustomers, effectiveAgents, effectiveTeams, effectiveDepartments, propRules, pulseKey])

  const agentPerformance = useMemo(() => {
    const agentNames = [
      ...new Set([
        ...effectiveAgents.map((a) => (typeof a === 'string' ? a : a?.name)).filter(Boolean),
        'Kiran Shah',
        'Ahmed Khan',
        'Sara Davis',
      ]),
    ]

    return agentNames.map((name) => {
      const assigned = safeTickets.filter((t) => (t.assignee || '').toLowerCase() === name.toLowerCase())
      const active = assigned.filter((t) => t.status !== 'Resolved')
      const closed = assigned.filter((t) => t.status === 'Resolved')
      const criticalCount = assigned.filter((t) => t.priority === 'Critical' && t.status !== 'Resolved')
      const agentInfo = effectiveAgents.find((a) => (typeof a === 'object' ? a?.name : a)?.toLowerCase() === name.toLowerCase())

      return {
        name,
        role: agentInfo?.role || 'Support agent',
        department: agentInfo?.department || 'Core support',
        assignedCount: assigned.length,
        activeCount: active.length,
        closedCount: closed.length,
        criticalCount: criticalCount.length,
        resolutionPct: assigned.length > 0 ? Math.round((closed.length / assigned.length) * 100) : 100,
        status: active.length > 5 ? 'High Load' : active.length > 0 ? 'Optimal' : 'Available',
      }
    })
  }, [safeTickets, effectiveAgents, pulseKey])

  const departmentBreakdown = useMemo(() => {
    const deptMap = {}
    effectiveDepartments.forEach((d) => {
      const dName = typeof d === 'string' ? d : d?.name || 'General'
      deptMap[dName] = { total: 0, open: 0, resolved: 0, critical: 0 }
    })

    safeTickets.forEach((t) => {
      const dept = t.department || 'General'
      if (!deptMap[dept]) {
        deptMap[dept] = { total: 0, open: 0, resolved: 0, critical: 0 }
      }
      deptMap[dept].total += 1
      if (t.status === 'Resolved') deptMap[dept].resolved += 1
      else deptMap[dept].open += 1
      if (t.priority === 'Critical') deptMap[dept].critical += 1
    })

    return Object.entries(deptMap).map(([dept, data]) => ({
      name: dept,
      ...data,
      resolutionRate: data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0,
    }))
  }, [safeTickets, effectiveDepartments, pulseKey])

  const channelData = useMemo(() => {
    const channels = { Email: 0, Chat: 0, 'Web form': 0, API: 0, Phone: 0 }
    safeTickets.forEach((t) => {
      const ch = t.channel || 'Email'
      if (channels[ch] !== undefined) channels[ch] += 1
      else channels.Email += 1
    })
    return channels
  }, [safeTickets])

  return (
    <div className="reports-layout" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '20px' }}>
        <div>
          <p className="overline" style={{ margin: 0 }}>Executive Workspace Intelligence</p>
          <h2 style={{ margin: '4px 0 6px 0' }}>Comprehensive Project Performance Audit</h2>
          <p style={{ margin: 0, color: 'var(--muted, #64748b)', fontSize: '0.9rem' }}>
            Fully interconnected with Tickets, Customers, Agents, Teams, and Automations. Auto-updates on any change.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            className="filter-select"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px' }}
          >
            <option value="All">All Departments</option>
            {effectiveDepartments.map((d) => {
              const name = typeof d === 'string' ? d : d?.name || d?.id
              return name ? <option key={name} value={name}>{name}</option> : null
            })}
          </select>
          <button className="secondary-button" onClick={() => window.print()} title="Print or save PDF report">
            🖨️ Print / PDF
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Workload</div>
          <div className="metric-value">{metrics.total} Tickets</div>
          <div className="metric-trend green">
            ✓ <span>{metrics.resolutionRate}% Resolved ({metrics.resolved})</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Service SLA Compliance</div>
          <div className="metric-value">{metrics.slaCompliance}%</div>
          <div className={`metric-trend ${metrics.atRisk > 0 ? 'red' : 'green'}`}>
            {metrics.atRisk > 0 ? `! ${metrics.atRisk} At Risk` : '✓ 100% On Schedule'}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Customer Accounts</div>
          <div className="metric-value">{metrics.totalCustomers} Connected</div>
          <div className="metric-trend green">
            ↑ <span>Live Database Records</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Support Capacity</div>
          <div className="metric-value">{metrics.totalAgents} Agents</div>
          <div className="metric-trend green">
            ✓ <span>{metrics.totalTeams} Teams · {metrics.totalDepartments} Depts</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: '8px' }}>
        {[
          { id: 'overview', label: '📊 System Overview' },
          { id: 'agents', label: '👥 Agent & Team Matrix' },
          { id: 'departments', label: '🏢 Department Breakdown' },
          { id: 'channels', label: '🌐 Channels & SLA Risks' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`secondary-button ${activeTab === tab.id ? 'primary-button' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ borderRadius: '6px', padding: '8px 16px', fontWeight: '600' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="dashboard-grid">
          <section className="panel" style={{ padding: '20px' }}>
            <div className="panel-heading">
              <div>
                <h2>Resolution & Pipeline Velocity</h2>
                <p>Status split across all ticket operations</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
                  <span>Resolved ({metrics.resolved})</span>
                  <strong>{metrics.resolutionRate}%</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${metrics.resolutionRate}%`, height: '100%', background: '#10b981' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
                  <span>Open ({metrics.open})</span>
                  <strong>{metrics.total ? Math.round((metrics.open / metrics.total) * 100) : 0}%</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${metrics.total ? Math.round((metrics.open / metrics.total) * 100) : 0}%`, height: '100%', background: '#3b82f6' }} />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'agents' && (
        <section className="panel" style={{ padding: '20px' }}>
          <div className="panel-heading" style={{ marginBottom: '16px' }}>
            <div>
              <h2>Support Team Productivity</h2>
              <p>Individual ticket throughput and load</p>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border, #e2e8f0)', color: '#64748b' }}>
                  <th style={{ padding: '10px' }}>Agent Name</th>
                  <th style={{ padding: '10px' }}>Assigned</th>
                  <th style={{ padding: '10px' }}>Active</th>
                  <th style={{ padding: '10px' }}>Resolved</th>
                  <th style={{ padding: '10px' }}>Resolution %</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformance.map((agent) => (
                  <tr key={agent.name} style={{ borderBottom: '1px solid var(--border, #f1f5f9)' }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{agent.name}</td>
                    <td style={{ padding: '10px' }}>{agent.assignedCount}</td>
                    <td style={{ padding: '10px', color: '#3b82f6' }}>{agent.activeCount}</td>
                    <td style={{ padding: '10px', color: '#10b981', fontWeight: 600 }}>{agent.closedCount}</td>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{agent.resolutionPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'departments' && (
        <section className="panel" style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {departmentBreakdown.map((dept) => (
              <div key={dept.name} style={{ border: '1px solid var(--border, #e2e8f0)', borderRadius: '8px', padding: '16px' }}>
                <h3 style={{ margin: '0 0 8px 0' }}>{dept.name}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                  <span>Open: <strong>{dept.open}</strong></span>
                  <span>Resolved: <strong style={{ color: '#10b981' }}>{dept.resolved}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'channels' && (
        <section className="panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(channelData).map(([ch, count]) => (
              <div key={ch}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span>{ch}</span>
                  <strong>{count}</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px' }}>
                  <div style={{ width: `${metrics.total ? Math.round((count / metrics.total) * 100) : 0}%`, height: '100%', background: '#3b82f6', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
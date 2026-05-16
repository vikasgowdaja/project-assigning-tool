import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  ALL_FIELD_KEYS,
  DEFAULT_SELECTED,
  FIELD_GROUPS,
  STYLED_TEMPLATE_DEFAULT_COMMON,
  STYLED_TEMPLATE_DEFAULT_SELECTED,
  STYLED_TEMPLATE_FIELDS,
  buildRowForKeys,
  exportStyledTemplateWorkbook,
  getBatchYear,
  getGroupValue,
  sanitizeSheetName
} from '../utils/excelExport'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function FilterPills({ label, items, selected, onToggle }) {
  if (!items.length) return null

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-cyan-100/80">
        {label}{' '}
        <span className="font-normal text-cyan-100/40">(empty = include all)</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onToggle(item)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              selected.includes(item)
                ? 'bg-violet-500 text-white'
                : 'bg-white/10 text-cyan-100 hover:bg-white/20'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}

function FieldGroupPanel({ group, fields, selectedFields, onToggle, onToggleGroup }) {
  const allSelected = fields.every((f) => selectedFields.has(f.key))
  const noneSelected = fields.every((f) => !selectedFields.has(f.key))

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-cyan-300">{group}</span>
        <div className="flex gap-2">
          {!allSelected && (
            <button
              type="button"
              onClick={() => onToggleGroup(true)}
              className="text-[10px] text-cyan-400 underline hover:text-white"
            >
              all
            </button>
          )}
          {!noneSelected && (
            <button
              type="button"
              onClick={() => onToggleGroup(false)}
              className="text-[10px] text-cyan-400/60 underline hover:text-white"
            >
              none
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        {fields.map((field) => (
          <label
            key={field.key}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
          >
            <input
              type="checkbox"
              checked={selectedFields.has(field.key)}
              onChange={() => onToggle(field.key)}
              className="h-3.5 w-3.5 accent-cyan-400"
            />
            <span className="text-xs text-cyan-50/90">{field.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------
export function ExcelExportDialog({ isOpen, onClose, teams = [] }) {
  const [exportMode, setExportMode] = useState('custom')
  const [selectedFields, setSelectedFields] = useState(DEFAULT_SELECTED)
  const [styledSelectedFields, setStyledSelectedFields] = useState(
    () => new Set(STYLED_TEMPLATE_DEFAULT_SELECTED)
  )
  const [styledCommonFields, setStyledCommonFields] = useState(
    () => new Set(STYLED_TEMPLATE_DEFAULT_COMMON)
  )
  const [filterColleges, setFilterColleges] = useState([])
  const [filterDepartments, setFilterDepartments] = useState([])
  const [filterBatchYears, setFilterBatchYears] = useState([])
  const [groupBy, setGroupBy] = useState('none')

  // Derive filter options directly from live team data
  const allColleges = useMemo(
    () => [...new Set(teams.map((t) => t.college).filter(Boolean))].sort(),
    [teams]
  )
  const allDepartments = useMemo(
    () => [...new Set(teams.map((t) => t.department).filter(Boolean))].sort(),
    [teams]
  )
  const allBatchYears = useMemo(() => {
    const years = new Set()
    for (const team of teams) {
      const y = getBatchYear(team.leadUsn)
      if (y) years.add(y)
    }
    return [...years].sort()
  }, [teams])

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      if (filterColleges.length && !filterColleges.includes(team.college)) return false
      if (filterDepartments.length && !filterDepartments.includes(team.department)) return false
      if (filterBatchYears.length) {
        const y = getBatchYear(team.leadUsn)
        if (!filterBatchYears.includes(y)) return false
      }
      return true
    })
  }, [teams, filterColleges, filterDepartments, filterBatchYears])

  const toggleField = (key) => {
    setSelectedFields((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAllFields = (keys, value) => {
    setSelectedFields((prev) => {
      const next = new Set(prev)
      for (const k of keys) {
        if (value) next.add(k)
        else next.delete(k)
      }
      return next
    })
  }

  const toggleFilterPill = (setList, value) => {
    setList((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  const toggleStyledField = (key) => {
    setStyledSelectedFields((prev) => {
      const next = new Set(prev)
      const isSelected = next.has(key)

      if (isSelected) {
        next.delete(key)
        setStyledCommonFields((commonPrev) => {
          const commonNext = new Set(commonPrev)
          commonNext.delete(key)
          return commonNext
        })
      } else {
        next.add(key)
      }

      return next
    })
  }

  const toggleStyledCommon = (key) => {
    setStyledCommonFields((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })

    setStyledSelectedFields((prev) => {
      if (prev.has(key)) return prev
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }

  const setAllStyledFields = (selected) => {
    if (selected) {
      setStyledSelectedFields(new Set(STYLED_TEMPLATE_FIELDS.map((field) => field.key)))
      return
    }

    setStyledSelectedFields(new Set())
    setStyledCommonFields(new Set())
  }

  const setAllStyledCommon = (common) => {
    if (common) {
      setStyledCommonFields(new Set(styledSelectedFields))
      return
    }

    setStyledCommonFields(new Set())
  }

  const handleExport = async () => {
    if (!filteredTeams.length) {
      return
    }

    if (exportMode === 'styled-template') {
      await exportStyledTemplateWorkbook({
        teams: filteredTeams,
        selectedFieldKeys: Array.from(styledSelectedFields),
        commonFieldKeys: Array.from(styledCommonFields)
      })
      return
    }

    const orderedKeys = ALL_FIELD_KEYS.filter((k) => selectedFields.has(k))
    if (!orderedKeys.length) {
      return
    }

    const wb = XLSX.utils.book_new()

    if (groupBy === 'none') {
      const rows = filteredTeams.map((t) => buildRowForKeys(t, orderedKeys))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Teams')
    } else {
      const grouped = {}
      for (const team of filteredTeams) {
        const g = getGroupValue(team, groupBy)
        if (!grouped[g]) grouped[g] = []
        grouped[g].push(team)
      }

      for (const [groupName, groupTeams] of Object.entries(grouped).sort(([a], [b]) =>
        a.localeCompare(b)
      )) {
        const rows = groupTeams.map((t) => buildRowForKeys(t, orderedKeys))
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(rows),
          sanitizeSheetName(groupName)
        )
      }
    }

    const now = new Date()
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    XLSX.writeFile(wb, `teams-export-${datePart}.xlsx`)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/25 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/20 bg-slate-900/95 px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-white">Export Teams to Excel</h2>
            <p className="text-xs text-cyan-100/60">
              Filter, select columns, and group sheets as needed
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-cyan-200/70 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Export Mode */}
          <section className="rounded-2xl border border-amber-300/20 bg-amber-900/10 p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-200">
              Export Mode
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setExportMode('custom')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  exportMode === 'custom'
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-white/10 text-cyan-100 hover:bg-white/20'
                }`}
              >
                Custom Fields
              </button>
              <button
                type="button"
                onClick={() => setExportMode('styled-template')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  exportMode === 'styled-template'
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-white/10 text-cyan-100 hover:bg-white/20'
                }`}
              >
                Styled Template
              </button>
            </div>
            <p className="mt-2 text-xs text-cyan-100/60">
              Styled Template uses your current data values and applies the sample-like Excel design.
            </p>
          </section>

          {/* Filters */}
          <section className="space-y-3 rounded-2xl border border-violet-300/20 bg-violet-900/10 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-violet-200">
              Filter Teams
            </h3>
            <FilterPills
              label="College"
              items={allColleges}
              selected={filterColleges}
              onToggle={(v) => toggleFilterPill(setFilterColleges, v)}
            />
            <FilterPills
              label="Department"
              items={allDepartments}
              selected={filterDepartments}
              onToggle={(v) => toggleFilterPill(setFilterDepartments, v)}
            />
            <FilterPills
              label="Batch Year / Semester"
              items={allBatchYears}
              selected={filterBatchYears}
              onToggle={(v) => toggleFilterPill(setFilterBatchYears, v)}
            />
            {!allColleges.length && !allDepartments.length && !allBatchYears.length && (
              <p className="text-xs text-cyan-100/40">No filter data available yet.</p>
            )}
          </section>

          {exportMode === 'custom' ? (
            <section className="rounded-2xl border border-cyan-300/20 bg-cyan-900/10 p-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-cyan-200">
                Group Sheets By
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'none', label: 'Single Sheet' },
                  { value: 'college', label: 'College-wise' },
                  { value: 'department', label: 'Department-wise' },
                  { value: 'batchYear', label: 'Batch Year / Sem-wise' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGroupBy(opt.value)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      groupBy === opt.value
                        ? 'bg-cyan-500 text-white'
                        : 'bg-white/10 text-cyan-100 hover:bg-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {exportMode === 'custom' ? (
            <section className="rounded-2xl border border-emerald-300/20 bg-emerald-900/10 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  Select Columns / Fields
                </h3>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => toggleAllFields(ALL_FIELD_KEYS, true)}
                    className="text-xs text-emerald-300 underline hover:text-white"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAllFields(ALL_FIELD_KEYS, false)}
                    className="text-xs text-emerald-300/60 underline hover:text-white"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {FIELD_GROUPS.map(({ group, fields }) => (
                  <FieldGroupPanel
                    key={group}
                    group={group}
                    fields={fields}
                    selectedFields={selectedFields}
                    onToggle={toggleField}
                    onToggleGroup={(v) => toggleAllFields(fields.map((f) => f.key), v)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {exportMode === 'styled-template' ? (
            <section className="rounded-2xl border border-emerald-300/20 bg-emerald-900/10 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  Styled Fields and Common Merge Controls
                </h3>
                <div className="flex flex-wrap gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setAllStyledFields(true)}
                    className="text-emerald-300 underline hover:text-white"
                  >
                    Select All Fields
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllStyledFields(false)}
                    className="text-emerald-300/70 underline hover:text-white"
                  >
                    Clear Fields
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllStyledCommon(true)}
                    className="text-cyan-300 underline hover:text-white"
                  >
                    Mark All Selected as Common
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllStyledCommon(false)}
                    className="text-cyan-300/70 underline hover:text-white"
                  >
                    Clear Common Marks
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {STYLED_TEMPLATE_FIELDS.map((field) => {
                  const included = styledSelectedFields.has(field.key)
                  const isCommon = styledCommonFields.has(field.key)

                  return (
                    <div
                      key={field.key}
                      className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-cyan-50/90">
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={() => toggleStyledField(field.key)}
                          className="h-3.5 w-3.5 accent-emerald-400"
                        />
                        <span>{field.header}</span>
                      </label>

                      <label className="flex cursor-pointer items-center gap-2 text-xs text-cyan-100/80">
                        <input
                          type="checkbox"
                          checked={isCommon}
                          disabled={!included}
                          onChange={() => toggleStyledCommon(field.key)}
                          className="h-3.5 w-3.5 accent-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <span>Common (merge)</span>
                      </label>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          {/* Preview summary */}
          <p className="text-xs text-cyan-100/60">
            <span className="font-semibold text-cyan-100">{filteredTeams.length}</span> team
            {filteredTeams.length !== 1 ? 's' : ''} matched &nbsp;·&nbsp;
            {exportMode === 'custom' ? (
              <>
                <span className="font-semibold text-cyan-100">{selectedFields.size}</span> column
                {selectedFields.size !== 1 ? 's' : ''} selected
                {groupBy !== 'none' ? (
                  <>
                    &nbsp;·&nbsp; will create separate sheets per {groupBy === 'batchYear' ? 'batch year' : groupBy}
                  </>
                ) : null}
              </>
            ) : (
              <>
                <span className="font-semibold text-cyan-100">{styledSelectedFields.size}</span> field
                {styledSelectedFields.size !== 1 ? 's' : ''} selected &nbsp;·&nbsp;
                <span className="font-semibold text-cyan-100">{styledCommonFields.size}</span> marked as common (merged)
              </>
            )}
          </p>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-white/20 bg-slate-900/95 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/30 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              handleExport()
            }}
            disabled={
              filteredTeams.length === 0 ||
              (exportMode === 'custom' && selectedFields.size === 0) ||
              (exportMode === 'styled-template' && styledSelectedFields.size === 0)
            }
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportMode === 'styled-template' ? 'Download Styled Template' : 'Download Custom Excel'} ({filteredTeams.length})
          </button>
        </div>
      </div>
    </div>
  )
}

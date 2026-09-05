import * as React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { Search, ChevronDown, Check, X, School as SchoolIcon, Users } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

export interface SchoolOption {
  id: string
  name: string
  type: string
  city: string
  userCount?: number
}

interface SchoolComboboxProps {
  value: string
  onChange: (value: string, school?: SchoolOption) => void
  disabled?: boolean
  error?: string | null
  placeholder?: string
  className?: string
}

export function SchoolCombobox({
  value,
  onChange,
  disabled = false,
  error = null,
  placeholder = "Cari dan pilih asal sekolah / kampus...",
  className,
}: SchoolComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [schools, setSchools] = useState<SchoolOption[]>([])
  const [loading, setLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Fetch schools on mount
  useEffect(() => {
    let isMounted = true
    setLoading(true)
    api
      .get<{ total: number; schools: SchoolOption[] }>("/schools?limit=100")
      .then((res) => {
        if (isMounted) {
          setSchools(res.schools || [])
        }
      })
      .catch((err) => {
        console.error("Gagal memuat master data sekolah:", err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      // Focus search input on open
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  // Filter schools based on search query
  const filteredSchools = useMemo(() => {
    const query = search.toLowerCase().trim()
    if (!query) return schools
    return schools.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.city.toLowerCase().includes(query) ||
        s.type.toLowerCase().includes(query)
    )
  }, [schools, search])

  // Reset highlighted index when search results change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredSchools.length])

  // Scroll active item into view
  useEffect(() => {
    if (open && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" })
      }
    }
  }, [highlightedIndex, open])

  function handleSelect(school: SchoolOption) {
    onChange(school.name, school)
    setOpen(false)
    setSearch("")
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange("", undefined)
    setSearch("")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev < filteredSchools.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSchools.length - 1
      )
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filteredSchools[highlightedIndex]) {
        handleSelect(filteredSchools[highlightedIndex])
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      setOpen(false)
    }
  }

  const selectedSchool = schools.find(
    (s) => s.name.toLowerCase() === value.toLowerCase()
  )

  return (
    <div ref={containerRef} className={cn("relative w-full font-sans", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "w-full h-11 flex items-center justify-between gap-2 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-left text-sm transition-all outline-none",
          "hover:bg-[#faf5e8] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]",
          error && "border-[#ef4444] bg-[#ef4444]/5 focus:border-[#ef4444] focus:ring-[#ef4444]",
          disabled && "opacity-50 cursor-not-allowed",
          open && "border-[#0a0a0a] ring-1 ring-[#0a0a0a]"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <SchoolIcon className="size-4 shrink-0 text-[#6a6a6a]" />
          {value ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-semibold text-[#0a0a0a] truncate">{value}</span>
              {selectedSchool && (
                <span className="shrink-0 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] px-2 py-0.5 text-[10px] font-bold text-[#6a6a6a]">
                  {selectedSchool.type}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[#9a9a9a] truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation()
                  handleClear(e as any)
                }
              }}
              className="p-1 rounded-full text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-[#e5e5e5]/50 transition-colors"
              title="Hapus pilihan"
            >
              <X className="size-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "size-4 text-[#6a6a6a] transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-[16px] border border-[#e5e5e5] bg-[#ffffff] shadow-xl shadow-[#0a0a0a]/10 overflow-hidden animate-in fade-in-0 zoom-in-95">
          {/* Search Box */}
          <div className="p-2 border-b border-[#e5e5e5] bg-[#fffaf0]">
            <div className="relative flex items-center">
              <Search className="absolute left-3 size-4 text-[#6a6a6a] pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik nama sekolah atau kota..."
                className="w-full h-9 pl-9 pr-8 text-xs font-medium rounded-[8px] border border-[#e5e5e5] bg-white text-[#0a0a0a] placeholder:text-[#9a9a9a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 p-0.5 rounded-full text-[#9a9a9a] hover:text-[#0a0a0a]"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Results List */}
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto p-1.5 space-y-1 divide-y-0"
          >
            {loading ? (
              <li className="py-6 text-center text-xs text-[#6a6a6a]">
                Memuat master data sekolah...
              </li>
            ) : filteredSchools.length === 0 ? (
              <li className="py-6 px-4 text-center space-y-1.5">
                <p className="text-xs font-semibold text-[#0a0a0a]">
                  Sekolah tidak ditemukan dalam master data
                </p>
                <p className="text-[11px] text-[#6a6a6a]">
                  Pilih opsi <span className="font-semibold text-[#0a0a0a]">"Umum"</span> atau hubungi pengurus Vihara jika ingin mendaftarkan nama almamatermu.
                </p>
              </li>
            ) : (
              filteredSchools.map((item, idx) => {
                const isSelected = item.name.toLowerCase() === value.toLowerCase()
                const isHighlighted = idx === highlightedIndex

                return (
                  <li
                    key={item.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors text-left",
                      isHighlighted && "bg-[#faf5e8]",
                      isSelected && "bg-[#f5f0e0]"
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "text-xs font-semibold text-[#0a0a0a] truncate",
                            isSelected && "font-bold"
                          )}
                        >
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-medium text-[#6a6a6a]">
                          {item.city}
                        </span>
                        <span className="text-[#9a9a9a] text-[10px]">•</span>
                        <span className="rounded-[4px] bg-[#ebe6d6] px-1.5 py-0.2 text-[9px] font-bold text-[#0a0a0a]">
                          {item.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.userCount !== undefined && item.userCount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 px-2 py-0.5 text-[10px] font-bold text-[#22c55e]">
                          <Users className="size-2.5" />
                          <span>{item.userCount} Umat</span>
                        </span>
                      )}
                      {isSelected && (
                        <Check className="size-4 text-[#0a0a0a] shrink-0" />
                      )}
                    </div>
                  </li>
                )
              })
            )}
          </ul>

          {/* Footer Note */}
          <div className="px-3 py-2 border-t border-[#e5e5e5] bg-[#faf5e8] flex items-center justify-between text-[11px] text-[#6a6a6a]">
            <span>Master Data Terverifikasi</span>
            <span className="font-semibold text-[#0a0a0a]">
              {schools.length} Sekolah Terdaftar
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

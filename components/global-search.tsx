'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { Users, Briefcase, FileText, UserPlus, Loader2 } from 'lucide-react'
import { globalSearch, type SearchResult } from '@/app/actions/search'

const TYPE_LABELS: Record<SearchResult['type'], string> = {
  customer: 'Kunder',
  job: 'Jobs',
  quote: 'Tilbud',
  lead: 'Leads',
}

const TYPE_ICONS: Record<SearchResult['type'], React.ComponentType<{ className?: string }>> = {
  customer: Users,
  job: Briefcase,
  quote: FileText,
  lead: UserPlus,
}

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const data = await globalSearch(q)
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
    }
  }, [open])

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const key = r.type
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Global Søgning"
      description="Søg kunder, jobs, tilbud og leads"
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Søg kunder, jobs, tilbud, leads..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Søger...
            </div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>Ingen resultater for &ldquo;{query}&rdquo;</CommandEmpty>
          )}
          {!loading && Object.entries(grouped).map(([type, items]) => {
            const Icon = TYPE_ICONS[type as SearchResult['type']]
            return (
              <CommandGroup key={type} heading={TYPE_LABELS[type as SearchResult['type']]}>
                {items.map((item) => (
                  <CommandItem
                    key={`${item.type}-${item.id}`}
                    value={`${item.type}-${item.id}`}
                    onSelect={() => {
                      router.push(item.href)
                      onOpenChange(false)
                    }}
                    className="cursor-pointer"
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          })}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

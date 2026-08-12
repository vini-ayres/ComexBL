import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft, ChevronRight, CheckCircle2, Loader2, Search, Ship, Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { fetchDashboard } from '@/lib/api/dashboard'
import type { BlDocumentType, DashboardBlListItemDto } from '@/lib/api/types'
import { ApiError } from '@/lib/api/client'
import { cn, formatDateTime } from '@/lib/utils'

interface FinalizadoProcessNavigatorProps {
  currentTipo: BlDocumentType
  currentDocumentNumber: string
  onSelect: (item: DashboardBlListItemDto) => void
}

export function FinalizadoProcessNavigator({
  currentTipo,
  currentDocumentNumber,
  onSelect,
}: FinalizadoProcessNavigatorProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<string>('todos')
  const [items, setItems] = useState<DashboardBlListItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(timer)
  }, [search])

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetchDashboard({
        status: 'finalizado',
        page: 1,
        pageSize: 100,
        tipo: tipoFilter !== 'todos' ? tipoFilter : undefined,
        search: debouncedSearch || undefined,
      })
      setItems(result.items.data)
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : 'Não foi possível carregar a lista de processos.'
      setError(message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, tipoFilter])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const currentIndex = useMemo(
    () => items.findIndex(
      (item) => item.numeroBl === currentDocumentNumber && item.tipo === currentTipo,
    ),
    [items, currentDocumentNumber, currentTipo],
  )

  const previousItem = currentIndex > 0 ? items[currentIndex - 1] : null
  const nextItem = currentIndex >= 0 && currentIndex < items.length - 1 ? items[currentIndex + 1] : null

  function handlePrevious() {
    if (previousItem) onSelect(previousItem)
  }

  function handleNext() {
    if (nextItem) onSelect(nextItem)
  }

  return (
    <Card className="lg:w-72 xl:w-80 shrink-0 h-fit lg:sticky lg:top-20">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success-600" />
            Finalizados
          </CardTitle>
          <Badge variant="neutral" className="text-[10px]">
            {loading ? '…' : items.length}
          </Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar BL, navio..."
            className="h-8 pl-8 text-sm"
          />
        </div>

        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="h-8 text-sm">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="Master">Master</SelectItem>
            <SelectItem value="House">House</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center justify-between gap-1 rounded-lg border border-border bg-white px-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!previousItem || loading}
            onClick={handlePrevious}
            title={previousItem ? `Anterior: ${previousItem.numeroBl}` : 'Sem anterior'}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[11px] font-medium text-primary-800 px-1 min-w-[72px] text-center">
            {currentIndex >= 0 ? `${currentIndex + 1} / ${items.length}` : '—'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!nextItem || loading}
            onClick={handleNext}
            title={nextItem ? `Próximo: ${nextItem.numeroBl}` : 'Sem próximo'}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        ) : error ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-xs text-danger-600">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void loadItems()}>
              Tentar novamente
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum processo encontrado.
          </p>
        ) : (
          <ScrollArea className="h-[min(420px,calc(100vh-320px))]">
            <div className="space-y-1 pr-3">
              {items.map((item) => {
                const isActive = item.numeroBl === currentDocumentNumber && item.tipo === currentTipo
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item)}
                    className={cn(
                      'w-full text-left rounded-lg border px-3 py-2.5 transition-colors',
                      isActive
                        ? 'border-success-200 bg-success-50/80 ring-1 ring-success-100'
                        : 'border-transparent hover:border-border hover:bg-primary-50/50',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm text-primary-900 truncate">
                        {item.numeroBl}
                      </span>
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        {item.tipo}
                      </Badge>
                    </div>
                    {item.navio && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <Ship className="h-3 w-3 shrink-0" />
                        {item.navio}
                      </p>
                    )}
                    {item.dataHora && (
                      <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                        {formatDateTime(item.dataHora)}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

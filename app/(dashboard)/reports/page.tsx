'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  Briefcase,
  TrendingUp,
  Percent,
  AlertCircle,
  Download,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  getReportKPIs,
  getMonthlyRevenue,
  getJobsByServiceType,
  getConversionFunnel,
  getTopCustomers,
  type ReportKPIs,
} from '@/lib/actions/reports'
import { exportJobsCSV } from '@/lib/actions/export'

const DANISH_MONTHS = [
  'januar', 'februar', 'marts', 'april', 'maj', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'december',
]

type DateRange = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all'

function getDateRange(range: DateRange): { start: string; end: string; label: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (range) {
    case 'this_month':
      return {
        start: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        end: `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`,
        label: `${DANISH_MONTHS[month]} ${year}`,
      }
    case 'last_month': {
      const lm = month === 0 ? 11 : month - 1
      const ly = month === 0 ? year - 1 : year
      return {
        start: `${ly}-${String(lm + 1).padStart(2, '0')}-01`,
        end: `${ly}-${String(lm + 1).padStart(2, '0')}-${new Date(ly, lm + 1, 0).getDate()}`,
        label: `${DANISH_MONTHS[lm]} ${ly}`,
      }
    }
    case 'this_quarter': {
      const q = Math.floor(month / 3) * 3
      return {
        start: `${year}-${String(q + 1).padStart(2, '0')}-01`,
        end: `${year}-${String(q + 3).padStart(2, '0')}-${new Date(year, q + 3, 0).getDate()}`,
        label: `Q${Math.floor(month / 3) + 1} ${year}`,
      }
    }
    case 'this_year':
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
        label: `${year}`,
      }
    case 'all':
      return {
        start: '2020-01-01',
        end: '2030-12-31',
        label: 'Alle',
      }
  }
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('this_month')
  const [kpis, setKpis] = useState<ReportKPIs | null>(null)
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ name: string; revenue: number }[]>([])
  const [serviceData, setServiceData] = useState<{ name: string; count: number; color: string }[]>([])
  const [funnelData, setFunnelData] = useState<{ stage: string; count: number }[]>([])
  const [topCustomers, setTopCustomers] = useState<{ name: string; jobCount: number; revenue: number; lastJob: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { start, end } = getDateRange(dateRange)
    setLoading(true)

    Promise.all([
      getReportKPIs(start, end),
      getMonthlyRevenue(new Date().getFullYear()),
      getJobsByServiceType(start, end),
      getConversionFunnel(start, end),
      getTopCustomers(start, end),
    ]).then(([k, m, s, f, tc]) => {
      setKpis(k)
      setMonthlyRevenue(m)
      setServiceData(s)
      setFunnelData(f)
      setTopCustomers(tc)
      setLoading(false)
    })
  }, [dateRange])

  const handleExport = async () => {
    const { start, end } = getDateRange(dateRange)
    try {
      const csv = await exportJobsCSV(start, end)
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `jobs-rapport-${start}-${end}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // toast would be nice here but keeping it simple
    }
  }

  const formatKr = (amount: number) =>
    new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 }).format(amount) + ' kr'

  const totalServiceJobs = serviceData.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Rapporter</h2>
          <p className="text-muted-foreground">Overblik over forretningens nøgletal</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm min-h-[44px]"
          >
            <option value="this_month">Denne måned</option>
            <option value="last_month">Sidste måned</option>
            <option value="this_quarter">Dette kvartal</option>
            <option value="this_year">I år</option>
            <option value="all">Alle</option>
          </select>
          <Button variant="outline" onClick={handleExport} className="gap-2 min-h-[44px]">
            <Download className="h-4 w-4" />
            Eksporter CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  Omsætning
                </div>
                <p className="text-xl font-bold">{formatKr(kpis?.revenue || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatKr(kpis?.ytdRevenue || 0)} i år
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Briefcase className="h-4 w-4" />
                  Jobs
                </div>
                <p className="text-xl font-bold">{kpis?.jobCount || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis?.ytdJobCount || 0} i år
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Gns. jobværdi
                </div>
                <p className="text-xl font-bold">{formatKr(kpis?.avgJobValue || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Percent className="h-4 w-4" />
                  Konvertering
                </div>
                <p className="text-xl font-bold">{kpis?.conversionRate || 0}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <AlertCircle className="h-4 w-4" />
                  Ubetalt
                </div>
                <p className="text-xl font-bold">{formatKr(kpis?.unpaidAmount || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis?.unpaidCount || 0} fakturaer
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Monthly Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Månedlig omsætning</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value) => [formatKr(Number(value)), 'Omsætning']}
                        labelFormatter={(label) => `${label}`}
                      />
                      <Bar dataKey="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Jobs by service type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Jobs per servicetype</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {serviceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={serviceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="count"
                          nameKey="name"
                          label={({ name, value }) => `${name} (${value})`}
                          labelLine={false}
                        >
                          {serviceData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [Number(value), 'Jobs']} />
                        <Legend />
                        <text
                          x="50%"
                          y="50%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-2xl font-bold"
                          fill="#333"
                        >
                          {totalServiceJobs}
                        </text>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Ingen data for perioden
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Konverteringstragt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnelData.map((stage, i) => {
                  const maxCount = Math.max(...funnelData.map((s) => s.count), 1)
                  const widthPercent = (stage.count / maxCount) * 100
                  const dropOff = i > 0 && funnelData[i - 1].count > 0
                    ? Math.round(((funnelData[i - 1].count - stage.count) / funnelData[i - 1].count) * 100)
                    : null

                  return (
                    <div key={stage.stage}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{stage.stage}</span>
                        <div className="flex items-center gap-2">
                          {dropOff !== null && (
                            <span className="text-xs text-red-500">-{dropOff}%</span>
                          )}
                          <span className="text-sm font-bold tabular-nums">{stage.count}</span>
                        </div>
                      </div>
                      <div className="h-8 rounded-md bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-md bg-green-500 transition-all"
                          style={{ width: `${Math.max(widthPercent, 2)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top kunder</CardTitle>
            </CardHeader>
            <CardContent>
              {topCustomers.length === 0 ? (
                <p className="text-muted-foreground text-sm">Ingen data for perioden</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Kunde</th>
                        <th className="text-right p-2 font-medium">Jobs</th>
                        <th className="text-right p-2 font-medium">Omsætning</th>
                        <th className="text-right p-2 font-medium hidden sm:table-cell">Seneste job</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCustomers.map((c, i) => (
                        <tr key={i} className="border-b last:border-b-0">
                          <td className="p-2 font-medium">{c.name}</td>
                          <td className="p-2 text-right tabular-nums">{c.jobCount}</td>
                          <td className="p-2 text-right tabular-nums">{formatKr(c.revenue)}</td>
                          <td className="p-2 text-right text-muted-foreground hidden sm:table-cell">
                            {new Date(c.lastJob).toLocaleDateString('da-DK')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

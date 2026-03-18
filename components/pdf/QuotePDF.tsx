import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf', fontWeight: 700 },
  ],
})

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 10,
    padding: 40,
    color: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#16a34a',
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 8,
    color: '#6b7280',
    lineHeight: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 20,
  },
  metaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 600,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1, textAlign: 'right' },
  colTotal: { flex: 1, textAlign: 'right' },
  headerText: {
    fontSize: 8,
    fontWeight: 700,
    color: '#374151',
    textTransform: 'uppercase',
  },
  cellText: {
    fontSize: 9,
  },
  totalsSection: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: 200,
    paddingVertical: 3,
  },
  totalLabel: {
    flex: 1,
    textAlign: 'right',
    paddingRight: 10,
    fontSize: 9,
  },
  totalValue: {
    width: 80,
    textAlign: 'right',
    fontSize: 9,
  },
  totalBold: {
    fontWeight: 700,
    color: '#16a34a',
    fontSize: 11,
  },
  acceptBox: {
    marginTop: 30,
    backgroundColor: '#16a34a',
    borderRadius: 6,
    padding: 15,
    alignItems: 'center',
  },
  acceptText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 5,
  },
  acceptUrl: {
    color: '#dcfce7',
    fontSize: 8,
  },
  notes: {
    marginTop: 20,
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#9ca3af',
  },
})

function formatDanishPrice(amount: number): string {
  return new Intl.NumberFormat('da-DK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' kr'
}

function formatDanishDate(dateStr: string): string {
  const MONTHS = [
    'januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december',
  ]
  const d = new Date(dateStr)
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

interface QuoteLineItem {
  service_name: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
}

interface QuotePDFProps {
  quote: {
    quote_number: string
    status: string
    created_at: string
    valid_until: string | null
    subtotal: number
    vat_amount: number
    total_incl_vat: number
    line_items: QuoteLineItem[]
    notes: string | null
    accept_token: string | null
  }
  customer: {
    full_name: string
    address: string
    city: string
    zip_code: string
  } | null
  company: {
    company_name: string
    address: string
    postal_code: string
    city: string
    cvr: string
    phone: string
    email: string
  }
  baseUrl: string
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Kladde',
    sent: 'Sendt',
    accepted: 'Accepteret',
    declined: 'Afvist',
    expired: 'Udl\u00f8bet',
  }
  return map[status] || status
}

function unitLabel(unit: string): string {
  switch (unit) {
    case 'm2': return 'm\u00b2'
    case 'stk': return 'stk'
    case 'time': return 'time'
    case 'fast_pris': return 'fast pris'
    default: return unit
  }
}

export function QuotePDF({ quote, customer, company, baseUrl }: QuotePDFProps) {
  const lineItems = quote.line_items || []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{company.company_name}</Text>
          <View>
            <Text style={styles.companyInfo}>{company.address}</Text>
            <Text style={styles.companyInfo}>{company.postal_code} {company.city}</Text>
            {company.cvr && <Text style={styles.companyInfo}>CVR: {company.cvr}</Text>}
            {company.phone && <Text style={styles.companyInfo}>Tlf: {company.phone}</Text>}
            {company.email && <Text style={styles.companyInfo}>{company.email}</Text>}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>TILBUD #{quote.quote_number}</Text>

        {/* Meta */}
        <View style={styles.metaSection}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Til</Text>
            <Text style={styles.metaValue}>{customer?.full_name || 'Ukendt'}</Text>
            {customer && (
              <Text style={{ fontSize: 9, color: '#6b7280' }}>
                {customer.address}, {customer.zip_code} {customer.city}
              </Text>
            )}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Dato</Text>
            <Text style={styles.metaValue}>{formatDanishDate(quote.created_at)}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Gyldig til</Text>
            <Text style={styles.metaValue}>
              {quote.valid_until ? formatDanishDate(quote.valid_until) : '\u2014'}
            </Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>{statusLabel(quote.status)}</Text>
          </View>
        </View>

        {/* Line items table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.colDesc]}>Beskrivelse</Text>
          <Text style={[styles.headerText, styles.colQty]}>Antal</Text>
          <Text style={[styles.headerText, styles.colPrice]}>Enhedspris</Text>
          <Text style={[styles.headerText, styles.colTotal]}>Total</Text>
        </View>
        {lineItems.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.cellText, styles.colDesc]}>{item.service_name}</Text>
            <Text style={[styles.cellText, styles.colQty]}>
              {item.quantity} {unitLabel(item.unit)}
            </Text>
            <Text style={[styles.cellText, styles.colPrice]}>
              {formatDanishPrice(item.unit_price)}
            </Text>
            <Text style={[styles.cellText, styles.colTotal]}>
              {formatDanishPrice(item.line_total)}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatDanishPrice(quote.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Moms (25%)</Text>
            <Text style={styles.totalValue}>{formatDanishPrice(quote.vat_amount)}</Text>
          </View>
          <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#d1d5db', paddingTop: 6 }]}>
            <Text style={[styles.totalLabel, styles.totalBold]}>I alt inkl. moms</Text>
            <Text style={[styles.totalValue, styles.totalBold]}>{formatDanishPrice(quote.total_incl_vat)}</Text>
          </View>
        </View>

        {/* Notes */}
        {quote.notes && (
          <View style={styles.notes}>
            <Text style={{ fontWeight: 600, marginBottom: 3 }}>Noter:</Text>
            <Text>{quote.notes}</Text>
          </View>
        )}

        {/* Accept box for sent quotes */}
        {quote.status === 'sent' && quote.accept_token && (
          <View style={styles.acceptBox}>
            <Text style={styles.acceptText}>Accepter dette tilbud online:</Text>
            <Text style={styles.acceptUrl}>
              {baseUrl}/api/accept-quote?token={quote.accept_token}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Tilbud {quote.quote_number}</Text>
          <Text>{company.company_name}{company.cvr ? ` \u00b7 CVR: ${company.cvr}` : ''}</Text>
        </View>
      </Page>
    </Document>
  )
}

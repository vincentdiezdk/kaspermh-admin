'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export function InvoiceClient({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const jobId = params.id as string

  return (
    <div>
      {/* Action bar - hidden when printing */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href={`/jobs/${jobId}`}>
          <Button variant="ghost" size="sm" className="gap-1 min-h-[44px]">
            <ArrowLeft className="h-4 w-4" />
            Tilbage til job
          </Button>
        </Link>
        <Button
          onClick={() => window.print()}
          className="gap-2 bg-green-600 hover:bg-green-700 text-white min-h-[44px]"
        >
          <Printer className="h-4 w-4" />
          Print / Gem som PDF
        </Button>
      </div>

      {children}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .invoice-page,
          .invoice-page * {
            visibility: visible;
          }
          .invoice-page {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
            margin: 0;
            box-shadow: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          nav, header, aside, footer {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

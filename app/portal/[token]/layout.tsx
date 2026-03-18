import type { Metadata } from 'next'
import Link from 'next/link'
import { validatePortalToken } from '@/lib/actions/portal'

export const metadata: Metadata = {
  title: 'Kundeportal – KasperMH',
  robots: { index: false, follow: false },
}

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const customer = await validatePortalToken(token)

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Link udløbet</h1>
          <p className="text-gray-600">
            Dit link er udløbet eller ugyldigt. Kontakt Kasper for at få et nyt link.
          </p>
          <div className="pt-4 text-sm text-gray-500">
            <p>KasperMH Haveservice</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href={`/portal/${token}`} className="text-lg font-bold text-green-600">
              KasperMH
            </Link>
            <span className="text-sm text-gray-600">{customer.customer_name}</span>
          </div>
          <nav className="flex gap-4 mt-2 text-sm">
            <Link
              href={`/portal/${token}`}
              className="text-gray-600 hover:text-green-600 transition-colors pb-1"
            >
              Overblik
            </Link>
            <Link
              href={`/portal/${token}/jobs`}
              className="text-gray-600 hover:text-green-600 transition-colors pb-1"
            >
              Jobs
            </Link>
            <Link
              href={`/portal/${token}/invoices`}
              className="text-gray-600 hover:text-green-600 transition-colors pb-1"
            >
              Fakturaer
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p className="font-medium text-gray-700">KasperMH Haveservice</p>
          <p className="mt-1">Kontakt os for spørgsmål</p>
        </div>
      </footer>
    </div>
  )
}

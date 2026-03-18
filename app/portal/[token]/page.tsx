import { getPortalOverview } from '@/lib/actions/portal'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function PortalOverviewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await getPortalOverview(token)

  if (!data) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hej {data.customer.customer_name}
        </h1>
        <p className="text-gray-600 mt-1">Velkommen til din kundeportal</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Antal jobs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.jobCount}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Åbne fakturaer</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.unpaidCount}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Seneste job</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {data.latestJobDate
              ? new Date(data.latestJobDate + 'T00:00:00').toLocaleDateString('da-DK')
              : '–'}
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Link
          href={`/portal/${token}/jobs`}
          className="bg-white rounded-xl border p-5 hover:border-green-300 hover:shadow-sm transition-all"
        >
          <h3 className="font-semibold text-gray-900">Se dine jobs</h3>
          <p className="text-sm text-gray-500 mt-1">Oversigt over alle udførte og planlagte opgaver</p>
        </Link>
        <Link
          href={`/portal/${token}/invoices`}
          className="bg-white rounded-xl border p-5 hover:border-green-300 hover:shadow-sm transition-all"
        >
          <h3 className="font-semibold text-gray-900">Se fakturaer</h3>
          <p className="text-sm text-gray-500 mt-1">Download og se dine fakturaer</p>
        </Link>
      </div>
    </div>
  )
}

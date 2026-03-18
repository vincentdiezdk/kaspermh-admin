export const smsTemplates = {
  // Sent when a job is booked/created
  jobConfirmation: (data: {
    customerName: string
    date: string
    time: string
    service: string
    phone: string
  }) => {
    const firstName = data.customerName.split(' ')[0]
    return `Hej ${firstName}. KasperMH har booket ${data.service.toLowerCase()} ${data.date} kl. ${data.time}. Spørgsmål? Ring ${data.phone}`
  },

  // Sent day before job
  jobReminder: (data: {
    customerName: string
    time: string
    service: string
  }) => {
    const firstName = data.customerName.split(' ')[0]
    return `Hej ${firstName}. Påmindelse: Vi ses i morgen kl. ${data.time} til ${data.service.toLowerCase()}. Sørg venligst for fri adgang. Mvh KasperMH`
  },

  // Sent when Kasper is en route
  enRoute: (data: {
    customerName: string
    estimatedMinutes?: number
  }) => {
    const firstName = data.customerName.split(' ')[0]
    const eta = data.estimatedMinutes
      ? ` og er der om ca. ${data.estimatedMinutes} min`
      : ''
    return `Hej ${firstName}. Kasper er på vej${eta}. Mvh KasperMH`
  },

  // Sent when job is completed
  jobCompleted: (data: {
    customerName: string
    service: string
  }) => {
    const firstName = data.customerName.split(' ')[0]
    return `Hej ${firstName}. ${data.service} er nu udført. Jobraport med fotos er sendt til din email. Faktura følger. Mvh KasperMH`
  },

  // Sent when invoice is created
  invoiceSent: (data: {
    customerName: string
    invoiceNumber: string
    amount: string
    dueDate: string
  }) => {
    const firstName = data.customerName.split(' ')[0]
    return `Hej ${firstName}. Faktura ${data.invoiceNumber} på ${data.amount} er sendt til din email. Betaling senest ${data.dueDate}. Mvh KasperMH`
  },

  // Payment reminder (overdue)
  paymentReminder: (data: {
    customerName: string
    invoiceNumber: string
    amount: string
    mobilepayNumber?: string
  }) => {
    const firstName = data.customerName.split(' ')[0]
    const mpay = data.mobilepayNumber
      ? ` MobilePay: ${data.mobilepayNumber}.`
      : ''
    return `Venlig påmindelse: Faktura ${data.invoiceNumber} på ${data.amount} er forfalden.${mpay} Mvh KasperMH`
  },

  // Quote sent
  quoteSent: (data: {
    customerName: string
    amount: string
  }) => {
    const firstName = data.customerName.split(' ')[0]
    return `Hej ${firstName}. Du har modtaget et tilbud på ${data.amount} fra KasperMH. Tjek din email for detaljer. Mvh KasperMH`
  },
}

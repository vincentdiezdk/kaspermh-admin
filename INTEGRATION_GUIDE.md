# KasperMH Admin — Integrationsvejledning

## 1. Lead-webhook fra hjemmesiden

### Opsætning
1. Sæt `LEAD_WEBHOOK_SECRET` i Vercel (fx `whsec_randomstring123`)
2. Brug samme secret i kaspermh.dk's webhook-kald

### API Endpoint
```
POST https://kaspermh-admin.vercel.app/api/webhooks/lead
```

### Headers
```
Authorization: Bearer {LEAD_WEBHOOK_SECRET}
Content-Type: application/json
```

### Request body
```json
{
  "name": "Søren Nielsen",
  "email": "soeren@example.dk",
  "phone": "+45 23 45 67 89",
  "address": "Vesterbrogade 12, 8000 Aarhus",
  "service": "Algebehandling",
  "area_m2": 45,
  "estimated_price": 3375,
  "message": "Valgfri besked fra kunden",
  "source": "prisberegner"
}
```

### Påkrævede felter
- `name` — Kundens fulde navn
- `email` — Kundens email
- `phone` — Kundens telefonnummer

### Valgfrie felter
- `address` — Adresse
- `service` — Servicetypen (fx "Algebehandling")
- `area_m2` — Beregnet areal i m²
- `estimated_price` — Estimeret pris fra prisberegner
- `message` — Besked fra kunden
- `source` — Kilde ("prisberegner", "kontaktformular", "hjemmeside")

### Response (success)
```json
{ "success": true, "lead_id": "uuid", "message": "Lead oprettet" }
```

### Response (error)
```json
{ "error": "Manglende felter: name, email, phone er påkrævet" }
```

### Eksempel (JavaScript/fetch)
```javascript
await fetch('https://kaspermh-admin.vercel.app/api/webhooks/lead', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer whsec_xxxxxxxxxxxx',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    address: formData.address,
    service: selectedService,
    area_m2: calculatedArea,
    estimated_price: calculatedPrice,
    source: 'prisberegner',
  }),
});
```

---

## 2. Resend Email

### Opsætning
1. Opret konto på [resend.com](https://resend.com)
2. Tilføj kaspermh.dk som domæne i Resend (https://resend.com/domains)
3. Tilføj SPF og DKIM DNS-records som Resend angiver
4. Vent til domænet er verificeret
5. Opret en API-nøgle i Resend dashboard
6. Sæt disse miljøvariabler i Vercel:

```
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=KasperMH Haveservice <info@kaspermh.dk>
ADMIN_EMAIL=kontakt@kaspermh.dk
```

### Hvad sker der automatisk?
Når RESEND_API_KEY er sat, sender systemet automatisk emails ved:
- **Tilbud sendt** → Kunden modtager tilbud med "Acceptér tilbud" knap
- **Tilbud accepteret** → Kunden modtager bekræftelse, Kasper notificeres
- **Job oprettet** → Kunden modtager jobbekræftelse med dato og adresse
- **Job afsluttet** → Kunden modtager rapport med før/efter fotos
- **Faktura oprettet** → Kunden modtager faktura med betalingsoplysninger
- **Nyt lead fra hjemmesiden** → Kasper notificeres via email

### Uden RESEND_API_KEY
Systemet fungerer normalt — emails springes over med en advarsel i loggen.

---

## 3. Dinero Regnskab

### Opsætning
1. Opret en integration på [developer.dinero.dk](https://developer.dinero.dk)
2. Sæt disse miljøvariabler i Vercel:

```
DINERO_CLIENT_ID=isv_kaspermh
DINERO_CLIENT_SECRET=xxxx
DINERO_REDIRECT_URI=https://kaspermh-admin.vercel.app/api/dinero/callback
```

3. Gå til **Indstillinger → Virksomhed** i admin-panelet
4. Klik **"Forbind Dinero"**
5. Log ind med Kaspers Dinero-konto
6. Gem de returnerede tokens som miljøvariabler:

```
DINERO_ORGANIZATION_ID=xxxx
DINERO_ACCESS_TOKEN=xxxx
DINERO_REFRESH_TOKEN=xxxx
```

### Hvad synkroniseres?
Når Dinero er forbundet:
- **Nye kunder** → Oprettes som kontakter i Dinero
- **Fakturaer** → Eksporteres til Dinero bogføring
- **Betalinger** → Registreres i Dinero

### Uden Dinero credentials
Systemet fungerer normalt — Dinero-kald springes over med en advarsel i loggen.

---

## Miljøvariabler — Komplet oversigt

| Variabel | Beskrivelse | Påkrævet |
|---|---|---|
| `RESEND_API_KEY` | Resend API-nøgle | Nej (emails springes over) |
| `EMAIL_FROM` | Afsender-email | Nej (default: onboarding@resend.dev) |
| `ADMIN_EMAIL` | Kaspers notifikations-email | Nej (default: kontakt@kaspermh.dk) |
| `LEAD_WEBHOOK_SECRET` | Bearer token for lead webhook | Nej (webhook åben uden) |
| `NEXT_PUBLIC_APP_URL` | App URL for links i emails | Nej (default: kaspermh-admin.vercel.app) |
| `DINERO_CLIENT_ID` | Dinero OAuth client ID | Nej |
| `DINERO_CLIENT_SECRET` | Dinero OAuth client secret | Nej |
| `DINERO_REDIRECT_URI` | Dinero OAuth redirect URI | Nej |
| `DINERO_ORGANIZATION_ID` | Dinero organisation ID | Nej |
| `DINERO_ACCESS_TOKEN` | Dinero access token | Nej |
| `DINERO_REFRESH_TOKEN` | Dinero refresh token | Nej |

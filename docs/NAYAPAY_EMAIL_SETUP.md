# NayaPay Email Automation

NayaPay wallet deposits can be credited automatically from NayaPay payment receipt emails.

## Webhook Endpoint

Forward NayaPay receipt emails to:

`https://yourdomain.com/api/nayapay/email-webhook`

Use the same server-side `WEBHOOK_SECRET` value used by other payment webhooks.

## Payload

Any email parser, Zapier, Make, Postmark inbound webhook, or custom script can POST JSON like this:

```json
{
  "subject": "NayaPay payment received",
  "text": "You have received PKR 1,500. Transaction ID: NP123456789",
  "source": "postmark",
  "secret": "YOUR_SECRET"
}
```

The parser reads amount and TRX/reference ID from `subject`, `text`, `message`, or `html`.

## Customer Flow

1. Customer pays via NayaPay.
2. Customer submits a NayaPay wallet deposit request with the same TRX ID and amount.
3. Screenshot is optional for NayaPay.
4. When the NayaPay email webhook receives a matching amount and TRX ID, the pending deposit is approved and the wallet is credited automatically.

If the email arrives before the customer submits the deposit, the transaction is stored as pending and credited automatically when the matching deposit request is created.

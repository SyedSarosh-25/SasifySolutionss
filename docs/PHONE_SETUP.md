# Phone Setup

Use MacroDroid or Tasker to forward EasyPaisa notifications to the backend.

1. Install MacroDroid or Tasker on the phone receiving EasyPaisa notifications.
2. Create a trigger: Notification Received.
3. Select app: EasyPaisa.
4. Add action: HTTP POST.
5. URL: `https://yourdomain.com/api/easypaisa/webhook`
6. Header: `Content-Type: application/json`
7. Body:

```json
{
  "message": "{notification_text}",
  "source": "macrodroid",
  "secret": "YOUR_SECRET"
}
```

Set `WEBHOOK_SECRET` on the server to the same secret value. Do not put the real secret in frontend code.

Expected flow:

1. Phone receives an EasyPaisa notification.
2. MacroDroid or Tasker posts the notification text to `/api/easypaisa/webhook`.
3. Backend extracts amount and TRX ID, then stores the transaction as `pending`.
4. Customer opens Wallet, selects EasyPaisa, enters TRX ID, uploads the payment screenshot, and submits a manual deposit request.
5. Admin reviews the deposit in the admin deposits section and approves it before wallet balance is credited.

Manual test cases:

1. Valid notification with `Rs.1500` and `Trx ID: 51839979260` creates one pending record.
2. Sending the same notification again returns `duplicate: true` and does not create another creditable record.
3. Customer deposit requests require a TRX ID and payment screenshot.
4. Admin approval credits the user's wallet once.

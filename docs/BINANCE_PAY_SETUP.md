# Binance Pay Setup

Use this for the Binance Pay wallet display shown to customers.

## Create QR Code

1. Open the Binance mobile app.
2. Log in to your Binance account.
3. Go to `More > Pay`.
4. Tap `Receive` to get your QR code.
5. Save the QR image and upload it to image hosting such as IMGBB or Cloudinary.
6. Paste the image URL into admin setting `binance_pay_qr_url`.

## Copy Binance ID

1. Open `Account > Identification` in Binance.
2. Copy your Binance ID.
3. Paste it into admin setting `binance_pay_id`.

## Optional Display Fields

Set these in `/admin/settings`:

- `binance_pay_id`
- `binance_pay_name`
- `binance_pay_nickname`
- `binance_pay_qr_url`

## Important Notes

1. In the payment description, customers should include Binance ID, QR code, or Binance nickname.
2. Customers must use USDT, USDC, or BUSD for transactions.
3. Customers should submit the Binance Pay order ID or transaction ID to validate the payment.
4. Do not paste Binance API Key or Secret Key into frontend-visible settings.

## Manual Wallet Credit

Customers pay to the configured Binance Pay ID or QR code, then submit the Binance Pay order ID or transaction ID with a payment screenshot from the wallet deposit form.

Admins review the submitted deposit in the admin deposits section and approve it before the wallet balance is credited.

Binance Pay checkout creation and webhook wallet credit are disabled while manual payment mode is enabled. These server-side variables are only needed if automatic checkout is intentionally re-enabled later:

```env
BINANCE_API_KEY=your_merchant_api_key
BINANCE_API_SECRET=your_merchant_api_secret
BINANCE_PAY_BASE_URL=https://bpay.binanceapi.com
PUBLIC_APP_URL=https://yourdomain.com
```

The API key must come from the Binance Merchant Admin Portal. Normal trading API keys may fail with `INVALID_API_KEY_OR_IP`.

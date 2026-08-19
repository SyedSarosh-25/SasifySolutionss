import nodemailer from "nodemailer";

type DepositNotificationInput = {
  depositId: number;
  customerName?: string | null;
  customerEmail?: string | null;
  method: string;
  amount: string;
  submittedAmount?: string;
  submittedCurrency?: string;
  txid: string;
  hasScreenshot: boolean;
};

const depositNotificationTo = process.env.DEPOSIT_NOTIFICATION_EMAIL || "sasifysolutions2@gmail.com";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendDepositNotification(input: DepositNotificationInput) {
  const transport = createTransport();

  if (!transport) {
    console.warn("Deposit email notification skipped: SMTP_HOST, SMTP_USER, and SMTP_PASS are not configured.");
    return;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const methodLabel = input.method.replace(/_/g, " ").toUpperCase();

  await transport.sendMail({
    from,
    to: depositNotificationTo,
    subject: `New SASIFY deposit #${input.depositId} - ${methodLabel}`,
    text: [
      `New deposit request #${input.depositId}`,
      `Customer: ${input.customerName || "Customer"}`,
      `Email: ${input.customerEmail || "N/A"}`,
      `Method: ${methodLabel}`,
      `Amount credited in USD: ${input.amount}`,
      `Customer submitted amount: ${input.submittedAmount || input.amount} ${input.submittedCurrency || "USD"}`,
      `TRX ID: ${input.txid}`,
      `Payment screenshot: ${input.hasScreenshot ? "Submitted in admin panel" : "Missing"}`,
    ].join("\n"),
    html: `
      <h2>New SASIFY deposit request #${input.depositId}</h2>
      <p><strong>Customer:</strong> ${input.customerName || "Customer"}</p>
      <p><strong>Email:</strong> ${input.customerEmail || "N/A"}</p>
      <p><strong>Method:</strong> ${methodLabel}</p>
      <p><strong>Amount credited in USD:</strong> ${input.amount}</p>
      <p><strong>Customer submitted amount:</strong> ${input.submittedAmount || input.amount} ${input.submittedCurrency || "USD"}</p>
      <p><strong>TRX ID:</strong> ${input.txid}</p>
      <p><strong>Payment screenshot:</strong> ${input.hasScreenshot ? "Submitted in admin panel" : "Missing"}</p>
      <p>Open the admin panel deposits section to review and approve/reject this payment.</p>
    `,
  });
}

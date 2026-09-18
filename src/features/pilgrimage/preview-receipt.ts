export type PreviewReceipt = {
  agency: string;
  packageName: string;
  travelDates: string;
  packagePrice: string;
  bookingFee: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

/** Builds an offline, printable preview. Escapes catalogue text; embeds no scripts or remote resources. */
export function createPreviewReceiptHtml(receipt: PreviewReceipt, issuerLogo: string): string {
  const rows = [
    ["Agency", receipt.agency], ["Package", receipt.packageName],
    ["Travel dates", receipt.travelDates], ["Package price", receipt.packagePrice],
    ["Booking fee", receipt.bookingFee],
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>My Mega Holidays Receipt</title><style>
body{font:16px/1.6 system-ui,sans-serif;color:#17201f;margin:0;padding:24px;background:#eaf6f2}main{max-width:640px;margin:auto;padding:28px;background:white;border-radius:24px}.issuer{display:flex;align-items:center;gap:16px;padding-bottom:20px;border-bottom:2px solid #0c356f}.issuer img{width:82px;height:82px;object-fit:contain}.issuer p{margin:0;color:#687572;font-size:13px}.issuer strong{display:block;color:#0c356f;font-size:18px}h1{color:#075846;font-size:26px;margin-top:24px}dl{margin:24px 0}dl div{padding:12px 0;border-bottom:1px solid #d8e8e2}dt{font-weight:600}dd{margin:4px 0 0;overflow-wrap:anywhere}@media print{body{padding:0;background:white}main{max-width:none;padding:0}}
</style></head><body><main><div class="issuer"><img src="${issuerLogo}" alt="My Mega Holidays logo"><p>Issued by<strong>My Mega Holidays Sdn. Bhd.</strong>Company No. 199801015952 (472081-D)</p></div><h1>Receipt</h1><dl>${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl><p>Keep this receipt for reference. Use your browser's Print option to print or save as PDF.</p></main></body></html>`;
}

/** Downloads only the displayed synthetic receipt; never calls booking or payment APIs. */
export async function downloadPreviewReceipt(receipt: PreviewReceipt): Promise<void> {
  const logoResponse = await fetch("/images/my-mega-holidays-logo.jpeg");
  if (!logoResponse.ok) throw new Error("Issuer logo is unavailable.");
  const logoBlob = await logoResponse.blob();
  const logo = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Issuer logo could not be read."));
    reader.onerror = () => reject(new Error("Issuer logo could not be read."));
    reader.readAsDataURL(logoBlob);
  });
  const url = URL.createObjectURL(new Blob([createPreviewReceiptHtml(receipt, logo)], { type: "text/html;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "road2haramain-receipt.html";
  document.body.append(anchor);
  try { anchor.click(); }
  finally {
    anchor.remove();
    // Allow the browser to consume the object URL before releasing it.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

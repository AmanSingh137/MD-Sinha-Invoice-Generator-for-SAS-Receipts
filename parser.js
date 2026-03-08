// ── Helpers ───────────────────────────────────────────────────────────────────

function numberToWords(num) {
  const a = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen",
    "Seventeen","Eighteen","Nineteen"];
  const b = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function inWords(n) {
    if (n < 20)       return a[n];
    if (n < 100)      return (b[Math.floor(n/10)]+" "+a[n%10]).trim();
    if (n < 1000)     return (a[Math.floor(n/100)]+" Hundred "+inWords(n%100)).trim();
    if (n < 100000)   return (inWords(Math.floor(n/1000))+" Thousand "+inWords(n%1000)).trim();
    if (n < 10000000) return (inWords(Math.floor(n/100000))+" Lakh "+inWords(n%100000)).trim();
    return (inWords(Math.floor(n/10000000))+" Crore "+inWords(n%10000000)).trim();
  }
  return inWords(num).trim();
}

function amountToWords(amount) {
  const [r, p] = String(amount).split(".");
  let w = "Rupees " + numberToWords(parseInt(r));
  if (p && parseInt(p) > 0) w += " and " + numberToWords(parseInt(p)) + " Paisa ";
  return w + " Only";
}

function get(text, re) {
  return (text.match(re)?.[1] || '').trim();
}

// ── Item extraction ───────────────────────────────────────────────────────────
//
// pdf-parse produces each table field on its own line:
//   "10"                                        ← item number
//   "USCHLV01A0"                                ← serv no part 1
//   "07"                                        ← serv no part 2
//   "HIRING LMV;MAHINDRA MAXIMMO ,NO ,DAILY"   ← description
//   "24.000TAG        780.00      18720.00"      ← qty+uom+rate+amount merged

function extractItems(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Find the table header line
  const headerIdx = lines.findIndex(l => l.startsWith('Item No.') && l.includes('Serv'));
  if (headerIdx === -1) return [];

  const stopRe = /^(Grand Total|Surcharge|Total Amount|Page)/;
  const dataLines = lines.slice(headerIdx + 1);

  const items = [];
  let i = 0;

  while (i < dataLines.length && !stopRe.test(dataLines[i])) {
    // Item number: pure digits
    if (!/^\d+$/.test(dataLines[i])) { i++; continue; }

    i++; // skip item number (we use sequential sl instead)

    // Serv no: one or two consecutive pure-uppercase-alphanumeric lines
    let servNo = '';
    while (i < dataLines.length && /^[A-Z0-9]+$/.test(dataLines[i])) {
      servNo += dataLines[i];
      i++;
    }

    // Description: next non-empty line
    const description = dataLines[i] || '';
    i++;

    // Values line: "24.000TAG   780.00   18720.00"
    const valLine  = dataLines[i] || '';
    const valMatch = valLine.match(/^([\d.]+)(TAG|KM)\s+([\d.]+)\s+([\d.]+)/);
    i++;

    items.push({
      sl:          items.length + 1,
      servNo,
      sac:         '998412',
      description,
      qty:         valMatch ? parseFloat(valMatch[1]).toString() : '',
      unit:        valMatch ? (valMatch[2] === 'TAG' ? 'Each.' : 'Km') : '',
      rate:        valMatch ? valMatch[3] : '',
      amount:      valMatch ? valMatch[4] : '',
    });
  }

  return items;
}

// ── Main parser ───────────────────────────────────────────────────────────────

function parseSES(text) {
  if (!text.includes('SES Acknowledgment receipt')) {
    throw new Error(
      'Wrong file. Please upload the SES Acknowledgment receipt from Tata Steel ' +
      '(the document that says "SES Acknowledgment receipt" at the top).'
    );
  }

  const data = {};

  data.invoiceNo   = "MDSSRV" + Date.now().toString().slice(-5);
  data.invoiceDate = new Date().toLocaleDateString("en-GB");

  // Metadata — works on both spaced and no-space formats
  const arcNo      = get(text, /ARC No[:\s]+(\d+)/);
  data.woDoNo      = arcNo ? arcNo + "/122" : '';
  data.challanNo   = get(text, /Challan No\.[:\s]+(\d+)/);
  data.sesNo       = get(text, /SES No\.[:\s]+(\d+)/);
  data.serviceFrom = get(text, /Service From[:\s]+(\d{2}-[A-Za-z]{3}-\d{4})/);
  data.serviceTo   = get(text, /Service To[:\s]+(\d{2}-[A-Za-z]{3}-\d{4})/);

  // Grand Total — may have no space before number
  const taxable    = parseFloat(get(text, /Grand Total \(Excl taxes\)\s*([\d.]+)/) || 0);
  data.taxable     = taxable.toFixed(2);
  data.cgst        = (taxable * 0.06).toFixed(2);
  data.sgst        = (taxable * 0.06).toFixed(2);
  data.netAmount   = (taxable * 1.12).toFixed(2);
  data.amountInWords = amountToWords(data.netAmount);

  data.items = extractItems(text);

  return data;
}

// ── Template rendering ────────────────────────────────────────────────────────

function buildRows(items) {
  return items.map(item => `
    <tr>
      <td class="center">${item.sl}</td>
      <td class="helv-cell">${item.servNo}</td>
      <td class="center">${item.sac}</td>
      <td>${item.description}</td>
      <td class="center">${item.qty}</td>
      <td class="center small">${item.unit}</td>
      <td class="right">${item.rate}</td>
      <td class="right">${item.amount}</td>
    </tr>`
  ).join("\n");
}

function renderTemplate(template, data, copyLabel = "ORIGINAL FOR RECIPIENT") {
  const rows = buildRows(data.items);
  return template
    .replace(/\{\{copyLabel\}\}/g,     copyLabel)
    .replace(/\{\{invoiceNo\}\}/g,     data.invoiceNo)
    .replace(/\{\{woDoNo\}\}/g,        data.woDoNo)
    .replace(/\{\{invoiceDate\}\}/g,   data.invoiceDate)
    .replace(/\{\{woDate\}\}/g,        data.woDate || '')
    .replace(/\{\{challanNo\}\}/g,     data.challanNo)
    .replace(/\{\{sesNo\}\}/g,         data.sesNo)
    .replace(/\{\{serviceFrom\}\}/g,   data.serviceFrom)
    .replace(/\{\{serviceTo\}\}/g,     data.serviceTo)
    .replace(/\{\{rows\}\}/g,          rows)
    .replace(/\{\{taxable\}\}/g,       data.taxable)
    .replace(/\{\{cgst\}\}/g,          data.cgst)
    .replace(/\{\{sgst\}\}/g,          data.sgst)
    .replace(/\{\{netAmount\}\}/g,     data.netAmount)
    .replace(/\{\{amountInWords\}\}/g, data.amountInWords);
}

module.exports = { parseSES, buildRows, renderTemplate };
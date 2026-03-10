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
  if (p && parseInt(p) > 0) w += " and " + numberToWords(parseInt(p)) + " Paisa";
  return w + " Only";
}

function get(text, re) {
  return (text.match(re)?.[1] || '').trim();
}

function normaliseUnit(uom) {
  const map = { TAG: 'Each.', M: 'Mtr.', NOS: 'Nos.', KM: 'Km', EA: 'Each.' };
  return map[(uom || '').toUpperCase()] || uom;
}

// ── Item extraction ───────────────────────────────────────────────────────────
//
// pdf-parse produces each table field on its own line:
//   "10"                                       ← item number (digits only)
//   "USCEST04A0"                               ← serv no part 1
//   "03"                                       ← serv no part 2 (pure alphanumeric)
//   "TELE CBL LAYNG;JELLY FILLED ARMOURED ,3"  ← description line 1
//   "345.000M         38.00      13110.00"     ← qty+uom+rate+amount (val line)
//
// Description may span multiple lines before the val line.
// Val line is identified by: starts with digits immediately followed by a UOM code.

function extractItems(text) {
  const VAL_RE  = /^([\d.]+)(TAG|KM|M|NOS|EA)\s+([\d.]+)\s+([\d.]+)/;
  const STOP_RE = /^(Grand Total|Surcharge|Total Amount|Page)/;
  const SERV_RE = /^[A-Z0-9]+$/;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Find table header
  const headerIdx = lines.findIndex(l => l.startsWith('Item No.') && l.includes('Serv'));
  if (headerIdx === -1) return [];

  const data = lines.slice(headerIdx + 1);
  const items = [];
  let i = 0;

  while (i < data.length && !STOP_RE.test(data[i])) {
    // Item number: pure digits
    if (!/^\d+$/.test(data[i])) { i++; continue; }
    i++; // skip item number

    // Serv no: one or more consecutive pure-alphanumeric lines
    let servNo = '';
    while (i < data.length && SERV_RE.test(data[i])) {
      servNo += data[i];
      i++;
    }

    // Description: one or more lines until we hit the val line or stop
    const descParts = [];
    while (i < data.length && !VAL_RE.test(data[i]) && !STOP_RE.test(data[i]) && !/^\d+$/.test(data[i])) {
      descParts.push(data[i]);
      i++;
    }
    const description = descParts.join(' ').trim();

    // Val line: qty+uom+rate+amount
    const valMatch = (data[i] || '').match(VAL_RE);
    if (valMatch) i++;

    items.push({
      sl:          items.length + 1,
      servNo,
      description,
      qty:         valMatch ? parseFloat(valMatch[1]).toString() : '',
      unit:        valMatch ? normaliseUnit(valMatch[2]) : '',
      rate:        valMatch ? valMatch[3] : '',
      amount:      valMatch ? valMatch[4] : '',
    });
  }

  return items;
}

// ── Main parser ───────────────────────────────────────────────────────────────

function parseSES(text, cgst, sgst) {
  console.log("parseSES received:", typeof text, JSON.stringify(String(text).slice(0, 100)));
  if (!text.includes('SES Acknowledgment receipt')) {
    throw new Error(
      'Wrong file. Please upload the SES Acknowledgment receipt from Tata Steel.'
    );
  }

  const data = {};

  data.invoiceNo   = "MDSSRV" + Date.now().toString().slice(-5);
  data.invoiceDate = new Date().toLocaleDateString("en-GB");

  const arcNo      = get(text, /ARC No[:\s]+(\d+)/);
  data.woDoNo      = arcNo ? arcNo + "/122" : '';
  data.challanNo   = get(text, /Challan No\.[:\s]+(\d+)/);
  data.sesNo       = get(text, /SES No\.[:\s]+(\d+)/);
  data.serviceFrom = get(text, /Service From[:\s]+(\d{2}-[A-Za-z]{3}-\d{4})/);
  data.serviceTo   = get(text, /Service To[:\s]+(\d{2}-[A-Za-z]{3}-\d{4})/);

  const taxable    = parseFloat(get(text, /Grand Total \(Excl taxes\)\s*([\d.]+)/) || 0);
  data.taxable     = taxable.toFixed(2);
  data.cgst        = (taxable * cgst).toFixed(2);
  data.sgst        = (taxable * sgst).toFixed(2);
  const taxes    = parseFloat(data.cgst) + parseFloat(data.sgst);
  data.netAmount = (taxable + taxes).toFixed(2);
  data.amountInWords = amountToWords(data.netAmount);

  data.items = extractItems(text);

  return data;
}

// ── Template rendering ────────────────────────────────────────────────────────

function buildRows(items, sacCodes) {
  return items.map((item, i) => `
    <tr>
      <td class="center">${item.sl}</td>
      <td class="helv-cell">${item.servNo}</td>
      <td class="center">${sacCodes && sacCodes[i] !== undefined ? sacCodes[i] : ''}</td>
      <td>${item.description}</td>
      <td class="center">${item.qty}</td>
      <td class="center small">${item.unit}</td>
      <td class="right">${item.rate}</td>
      <td class="right">${item.amount}</td>
    </tr>`
  ).join("\n");
}

module.exports = { parseSES, buildRows, amountToWords };
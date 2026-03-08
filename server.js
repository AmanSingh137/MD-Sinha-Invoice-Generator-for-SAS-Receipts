const express   = require("express");
const multer    = require("multer");
const fs        = require("fs");
const path      = require("path");
const pdf       = require("pdf-parse");
const puppeteer = require("puppeteer");

const { parseSES } = require("./parser");

const app    = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── POST /generate ────────────────────────────────────────────────────────────

app.post("/generate", upload.single("pdf"), async (req, res) => {

  const tmpPath = req.file?.path;

  try {

    // ── Validate upload ─────────────────────────────────────────────────────

    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    // ── Extract text from PDF ───────────────────────────────────────────────

    const buffer  = fs.readFileSync(tmpPath);
    const pdfData = await pdf(buffer);
    const rawText = pdfData.text;

    console.log("\n=== RAW TEXT (first 300 chars) ===");
    console.log(JSON.stringify(rawText.slice(0, 800)));
    console.log("==================================\n");

    // ── Parse SES data (throws with clear message on wrong file) ───────────

    let parsed;
    try {
      parsed = parseSES(rawText);
    } catch (parseErr) {
      return res.status(400).send(parseErr.message);
    }

    // Attach woDate from form
    parsed.woDate = (req.body.woDate || "").trim();
    let inSAC = (req.body.SAC || "").split(",");

    console.log("Parsed Data:", JSON.stringify(parsed, null, 2));

    // ── Guard: items must be present ────────────────────────────────────────

    if (!parsed.items || parsed.items.length === 0) {
      return res.status(400).send(
        "Could not extract line items from the PDF. " +
        "Please upload the SES Acknowledgment receipt from Tata Steel."
      );
    }

    // ── Build table rows ────────────────────────────────────────────────────
    
    const rows = parsed.items.map((item, idx) => `
      <tr>
        <td class="center">${item.sl}</td>
        <td class="helv-cell">${item.servNo}</td>
        <td class="center">${inSAC[idx]}</td>
        <td>${item.description}</td>
        <td class="center">${item.qty}</td>
        <td class="center small">${item.unit}</td>
        <td class="right">${item.rate}</td>
        <td class="right">${item.amount}</td>
      </tr>`
    ).join("\n");

    // ── Load HTML template ──────────────────────────────────────────────────

    const templatePath = path.join(__dirname, "template", "invoice.html");
    const template     = fs.readFileSync(templatePath, "utf8");

    function buildPage(copyLabel) {
      let html = template;

      // Replace all string fields from parsed data
      for (const [key, val] of Object.entries(parsed)) {
        if (typeof val === "string") {
          html = html.replaceAll(`{{${key}}}`, val);
        }
      }

      // rows and copyLabel replaced last — can't be clobbered by parsed fields
      html = html.replaceAll("{{rows}}",      rows);
      html = html.replaceAll("{{copyLabel}}", copyLabel);

      return html;
    }

    // ── Assemble all 3 copies ───────────────────────────────────────────────

    const PAGE_BREAK = '<div style="page-break-after:always"></div>';

    const fullHTML = [
      buildPage("ORIGINAL FOR RECIPIENT"),
      buildPage("DUPLICATE FOR SUPPLIER"),
      buildPage("TRIPLICATE OFFICE COPY"),
    ].join(PAGE_BREAK);

    // ── Render to PDF via Puppeteer ─────────────────────────────────────────

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setContent(fullHTML, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format:          "A4",
      printBackground: true,
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
    });

    await browser.close();

    // ── Send PDF to client ──────────────────────────────────────────────────

    const filename = `invoice_${parsed.invoiceNo}.pdf`;

    res.set({
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });

    res.send(pdfBuffer);

  } catch (err) {

    console.error("SERVER ERROR:", err);
    res.status(500).send("Internal server error: " + err.message);

  } finally {

    // Always delete the uploaded temp file
    if (tmpPath && fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }

  }

});

// ── Start ─────────────────────────────────────────────────────────────────────

const server = app.listen(0, () => {
  console.log("Server started");
});

module.exports = server;
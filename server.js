const express   = require("express");
const multer    = require("multer");
const fs        = require("fs");
const path      = require("path");
const pdf       = require("pdf-parse");
const puppeteer = require("puppeteer");
const cors      = require("cors");

const { parseSES, buildRows } = require("./parser");

const app    = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── POST /generate ────────────────────────────────────────────────────────────

app.post("/generate", upload.single("pdf"), async (req, res) => {

  const tmpPath = req.file?.path;

  try {

    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    // ── Extract text via pdf-parse ──────────────────────────────────────────

    const buffer  = fs.readFileSync(tmpPath);
    const pdfData = await pdf(buffer);
    const rawText = pdfData.text;

    console.log("\n=== RAW TEXT (first 400 chars) ===");
    console.log(JSON.stringify(rawText.slice(0, 400)));
    console.log("==================================\n");

    // ── Parse SES ──────────────────────────────────────────────────────────

    let parsed;
    try {
      parsed = parseSES(rawText);
    } catch (e) {
      return res.status(400).send(e.message);
    }

    parsed.woDate  = (req.body.woDate || "").trim();
    const sacCodes = (req.body.SAC || "").split(",").map(s => s.trim());

    console.log("Parsed:", JSON.stringify(parsed, null, 2));

    if (!parsed.items || parsed.items.length === 0) {
      return res.status(400).send(
        "Could not extract line items. Please upload the SES Acknowledgment receipt."
      );
    }

    // ── Build rows ──────────────────────────────────────────────────────────

    const rows = buildRows(parsed.items, sacCodes);

    // ── Load template ───────────────────────────────────────────────────────

    const template = fs.readFileSync(
      path.join(__dirname, "template", "invoice.html"), "utf8"
    );

    function buildPage(copyLabel) {
      let html = template;
      for (const [key, val] of Object.entries(parsed)) {
        if (typeof val === "string") {
          html = html.replaceAll(`{{${key}}}`, val);
        }
      }
      html = html.replaceAll("{{rows}}",      rows);
      html = html.replaceAll("{{copyLabel}}", copyLabel);
      return html;
    }

    // ── Assemble 3 copies ───────────────────────────────────────────────────

    // const PAGE_BREAK = '<div style="page-break-after:always"></div>';
    // const fullHTML = [
    //   buildPage("ORIGINAL FOR RECIPIENT"),
    //   buildPage("DUPLICATE FOR SUPPLIER"),
    //   buildPage("TRIPLICATE OFFICE COPY"),
    // ].join(PAGE_BREAK);

    const fullHTML =
  buildPage("ORIGINAL FOR RECIPIENT") +
  '<div style="page-break-before:always">' + buildPage("DUPLICATE FOR SUPPLIER") + '</div>' +
  '<div style="page-break-before:always">' + buildPage("TRIPLICATE OFFICE COPY") + '</div>';

    // ── Render PDF ──────────────────────────────────────────────────────────

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

    // ── Send PDF ────────────────────────────────────────────────────────────

    res.set({
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="invoice_${parsed.invoiceNo}.pdf"`,
    });
    res.send(pdfBuffer);

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).send("Internal server error: " + err.message);
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }

});

// ── Start ─────────────────────────────────────────────────────────────────────

const server = app.listen(0, () => {
  console.log("Server running at http://localhost:" + server.address().port);
});
module.exports = server;
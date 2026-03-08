# SES PDF → Invoice Generator

### M.D. Sinha & Sons

## About the Company

**M.D. Sinha & Sons** is a progressive engineering and contracting firm that has consistently believed in adopting technology to improve operational efficiency, accuracy, and service delivery. Over the years, the company has worked closely with large industrial organizations, contributing to infrastructure and electrical engineering operations with professionalism and reliability.

As engineering environments grow more complex, the ability to combine **technical expertise with efficient processes** becomes increasingly important. At M.D. Sinha & Sons, we believe that technology should not only solve engineering problems but also streamline internal workflows.

This project is an example of that philosophy. 

To learn more about us, visit: https://www.mdsinha.co.in/

---

# Project Overview

The **SES PDF → Invoice Generator** is an internal automation tool developed to assist supervisors and operational staff in quickly generating **tax invoices from Service Entry Sheet (SES) PDFs**.

In traditional workflows, supervisors had to manually extract information from SES documents and recreate invoices using spreadsheet templates. This process was repetitive, time-consuming, and prone to human error.

This tool automates the process by:

1. Reading the **SES PDF**
2. Extracting relevant information such as:

   * Challan number
   * SES number
   * Job period
   * Service items
   * Quantities
   * Rates
   * Amounts
3. Automatically generating a **formatted invoice using the official M.D. Sinha & Sons template**
4. Producing the required three invoice copies:

   * **Original for Recipient**
   * **Duplicate for Supplier**
   * **Triplicate Office Copy**

By reducing administrative overhead, the system allows our team to **focus more on solving networking and engineering challenges, improving service delivery, and providing better solutions to our partners and clients.**

---

# Why This Project Matters

At M.D. Sinha & Sons, our engineers and supervisors often operate in fast-moving industrial environments. Administrative tasks such as invoice preparation should never slow down technical progress.

This automation ensures:

* Faster invoice generation
* Accurate financial documentation
* Reduced manual workload
* Standardized invoice formatting
* Greater operational efficiency

This allows the team to **devote more time to technical work, infrastructure maintenance, and solving real engineering problems rather than repetitive paperwork.**

---

# Technology Stack

* **Node.js**
* **Express.js**
* **pdf-parse** – Extracts data from SES PDFs
* **Puppeteer** – Generates final PDF invoices
* **HTML/CSS Template** – Exact company invoice layout
* **Multer** – Handles file uploads

---

# Project Structure

```
PDF-InvoiceGenerator
│
├── server.js
├── parser.js
│
├── template
│   └── invoice.html
│
├── public
│   └── index.html
│
├── uploads
│
└── package.json
```

---

# Installation

Make sure you have the following installed:

* **Node.js (v18 or later recommended)**
* **npm**

Clone the repository:

```bash
git clone https://github.com/AmanSingh137/MD-Sinha-Invoice-Generator-for-SAS-Receipts.git
cd PDF-InvoiceGenerator
```

Install dependencies:

```bash
npm install
```

Required packages include:

* express
* multer
* pdf-parse
* puppeteer

---

# Running the Application

Start the server:

```bash
npm run dev
```

The server will start on:

```
http://localhost:3000
```

Open this address in your browser.

---

# How to Use

1. Open the web interface.
2. Enter the **Work Order (W.O.) Date**.
3. Upload the **SES PDF file**.
4. Click **Generate Invoice**.

The system will:

* Parse the SES document
* Extract service details
* Fill the official invoice template
* Generate a **3-page invoice PDF**
* Automatically download the generated invoice

---

# Output

The generated invoice contains:

* Company letterhead
* Service details extracted from SES
* Calculated tax amounts
* Amount in words (Indian numbering system)
* Three invoice copies:

```
Page 1 → ORIGINAL FOR RECIPIENT
Page 2 → DUPLICATE FOR SUPPLIER
Page 3 → TRIPLICATE OFFICE COPY
```

---

# Internal Impact

This tool significantly improves the workflow of supervisors working on service documentation.

Instead of manually creating invoices, supervisors can now generate them within seconds, ensuring that documentation keeps pace with the speed of field operations.

This allows the organization to focus on what truly matters:

* Maintaining high-quality engineering standards
* Solving networking and infrastructure challenges
* Delivering reliable solutions to industrial partners such as Tata Steel

---

# Future Improvements

Planned enhancements include:

* Automatic invoice number sequencing
* Improved SES table extraction
* Bulk SES processing
* Invoice history tracking
* Cloud deployment for internal access

---

# Acknowledgement

This project reflects the company’s ongoing commitment to **continuous improvement through technology**. At M.D. Sinha & Sons, we believe that even small tools like this can meaningfully improve productivity while maintaining the high standards expected by our partners and clients.

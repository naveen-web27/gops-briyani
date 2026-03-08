/**
 * ═══════════════════════════════════════════════════════
 *  RESTAURANT WEBSITE — Google Apps Script
 *  Saves reservation form submissions to Google Sheet
 * ═══════════════════════════════════════════════════════
 *
 *  HOW TO USE:
 *  1. Open your Google Sheet (same or different from Menu sheet)
 *  2. Extensions → Apps Script
 *  3. Paste this entire file, replacing all existing code
 *  4. Save → Deploy → New Deployment
 *     - Type: Web App
 *     - Execute as: Me
 *     - Who can access: Anyone
 *  5. Copy the Web App URL
 *  6. Paste into index.html → CONFIG.formURL
 */

function doPost(e) {
  try {
    // Get or create "Reservations" sheet tab
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let sheet   = ss.getSheetByName("Reservations");

    if (!sheet) {
      sheet = ss.insertSheet("Reservations");
      // Add headers on first use
      sheet.appendRow(["Timestamp", "Name", "Phone", "Date", "Guests", "Message", "Status"]);
      sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#8b1a1a").setFontColor("#ffffff");
    }

    // Parse incoming data
    const data = JSON.parse(e.postData.contents);

    // Append the reservation row
    sheet.appendRow([
      new Date(data.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      data.name    || "",
      data.phone   || "",
      data.date    || "",
      data.guests  || "",
      data.message || "",
      "Pending"  // default status — you can change to Confirmed/Cancelled manually
    ]);

    // Optional: Send a WhatsApp/email notification here

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test this function manually inside Apps Script editor
function testPost() {
  const e = {
    postData: {
      contents: JSON.stringify({
        timestamp: new Date().toISOString(),
        name:      "Test Customer",
        phone:     "+91 98765 43210",
        date:      "2025-12-25",
        guests:    "4 people",
        message:   "Anniversary dinner please"
      })
    }
  };
  const result = doPost(e);
  Logger.log(result.getContent());
}

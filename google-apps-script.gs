const SPREADSHEET_ID = "1chWoPA4oh7Ss2Xy2jZmUCTDRnmcbDU8L4ojsy46mJh8";
const FOLDER_ID = "1yizrv4TsQADhOxPLMVQSvOIMrSYNqoGs";
const ARVIND_EMAIL = "tushpadavi@gmail.com"; // User should verify this email

const BRANCH_EMAILS = {
  "Ludhiana": "kavita.acharya@ginzalimited.com",
  "Bangalore": "kuldeep.udhna@ginzalimited.com",
  "Surat": "kuldeep.udhna@ginzalimited.com",
  "Tirupur": "kuldeep.udhna@ginzalimited.com"
};

function getBranchSheet(ss, branchName) {
  branchName = (branchName || "Unknown Branch")
    .replace(/[\\\/\?\*\[\]]/g, "")
    .trim();

  let sheet = ss.getSheetByName(branchName);

  const headers = [
    "Timestamp", "Submission ID", "Branch Name", "Salesperson Name",
    "Expense Category", "Item Date", "From Location", "To Location",
    "Amount", "Attachment Link", "Remark", "Grand Total",
    "Approved", "Approved Timestamp", "Payment Process", "Processed By",
    "Status", "Payment Release", "Released By"
  ];

  if (!sheet) {
    sheet = ss.insertSheet(branchName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
  } else {
    // Update headers if they are missing or different
    const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (currentHeaders[0] !== "Timestamp" || currentHeaders.length < headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight("bold")
        .setBackground("#f3f3f3");
    }
  }

  return sheet;
}

function getNextDataRow(sheet) {
  const lastRow = sheet.getLastRow();
  return lastRow < 1 ? 2 : lastRow + 1;
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Invalid request data");
    }

    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const branchName = data.branchName || "Unknown Branch";
    const sheet = getBranchSheet(ss, branchName);

    const submissionId = "SUB-" + Utilities.getUuid().substring(0, 8).toUpperCase();
    const timestamp = new Date();
    const folder = DriveApp.getFolderById(FOLDER_ID);

    let totalClaimAmount = 0;
    let totalRows = 0;

    ['travel', 'food', 'accommodation', 'other'].forEach(c => {
      (data[c + 'Entries'] || []).forEach(i => {
        totalClaimAmount += Number(i.amount) || 0;
        totalRows++;
      });
    });

    const startRow = getNextDataRow(sheet);
    let currentRow = startRow;

    const processCategory = (categoryName, entries) => {
      entries.forEach(entry => {
        let fileUrl = "No Attachment";
        if (entry.attachment && entry.attachment.base64) {
          const blob = Utilities.newBlob(
            Utilities.base64Decode(entry.attachment.base64),
            entry.attachment.mimeType,
            categoryName + "_" + entry.attachment.name
          );
          const file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          fileUrl = file.getUrl();
        }

        sheet.getRange(currentRow, 1, 1, 11).setValues([[
          timestamp,
          submissionId,
          branchName,
          data.salespersonName || "",
          categoryName.toUpperCase(),
          entry.date || "",
          entry.from || "-",
          entry.to || "-",
          entry.amount || 0,
          fileUrl,
          data.remark || ""
        ]]);
        
        // Add Checkbox for Approved (Column M / 13)
        sheet.getRange(currentRow, 13).insertCheckboxes();
        
        currentRow++;
      });
    };

    if (data.categories?.includes('Travel')) processCategory('Travel', data.travelEntries || []);
    if (data.categories?.includes('Food')) processCategory('Food', data.foodEntries || []);
    if (data.categories?.includes('Accommodation')) processCategory('Accommodation', data.accommodationEntries || []);
    if (data.categories?.includes('Other')) processCategory('Other', data.otherEntries || []);

    if (totalRows > 0) {
      // Grand Total (L/12)
      const rangeL = sheet.getRange(startRow, 12, totalRows, 1);
      if (totalRows > 1) rangeL.merge();
      rangeL.setValue(totalClaimAmount)
            .setHorizontalAlignment("center")
            .setVerticalAlignment("middle")
            .setFontWeight("bold");

      // Payment Process (O/15)
      const rangeO = sheet.getRange(startRow, 15, totalRows, 1);
      if (totalRows > 1) rangeO.merge();
      const ruleO = SpreadsheetApp.newDataValidation().requireValueInList(['Process Payment'], true).build();
      rangeO.setDataValidation(ruleO)
            .setHorizontalAlignment("center")
            .setVerticalAlignment("middle");

      // Payment Release (R/18)
      const rangeR = sheet.getRange(startRow, 18, totalRows, 1);
      if (totalRows > 1) rangeR.merge();
      const ruleR = SpreadsheetApp.newDataValidation().requireValueInList(['Payment Release'], true).build();
      rangeR.setDataValidation(ruleR)
            .setHorizontalAlignment("center")
            .setVerticalAlignment("middle");
    }

    // Send initial email to Arvind
    sendArvindReviewEmail(sheet, startRow, totalClaimAmount, data.salespersonName, branchName);

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success", submissionId: submissionId }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendArvindReviewEmail(sheet, row, total, name, branch) {
  const date = sheet.getRange(row, 6).getValue();
  const sheetUrl = "https://docs.google.com/spreadsheets/d/" + SPREADSHEET_ID;
  
  const htmlBody = `
    <p>Dear Arvind Sir,</p>
    <p>Kindly review the Expenses Google Sheet using the link below:</p>
    <p><a href="${sheetUrl}">Open Expenses Sheet</a></p>
    <p>In this sheet, the expenses data has been organized and calculated based on the following fields:</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
      <tr style="background:#f2f2f2"><th>Date</th><th>Branch Name</th><th>Expenses Holder Name</th><th>Grand Total</th></tr>
      <tr><td>${date}</td><td>${branch}</td><td>${name}</td><td>${total}</td></tr>
    </table><br>
    <p>Please review the sheet and cross-check the bills with the attachments.</p>
    <p>Thank you for your time and support.</p>
  `;

  try {
    MailApp.sendEmail({
      to: ARVIND_EMAIL,
      subject: "New Expense Report for Review - " + name,
      htmlBody: htmlBody
    });
  } catch (e) {
    console.error("Email failed: " + e.toString());
  }
}

// Installable trigger for onEdit
function onEditTrigger(e) {
  if (!e) return;
  const range = e.range;
  const sheet = range.getSheet();
  const row = range.getRow();
  const col = range.getColumn();
  const value = e.value;
  const userEmail = Session.getActiveUser().getEmail();
  const timestamp = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd HH:mm:ss");
  const userName = userEmail.split('@')[0].toUpperCase();

  // Approved Checkbox (Column M / 13)
  if (col === 13 && row > 1) {
    if (value === "TRUE") {
      sheet.getRange(row, 14).setValue(userName + " - " + timestamp);
    } else {
      sheet.getRange(row, 14).clearContent();
    }
  }

  // Payment Process (Column O / 15)
  if (col === 15 && row > 1 && value === "Process Payment") {
    sheet.getRange(row, 16).setValue(userName + " - " + timestamp);
    
    const branch = sheet.getRange(row, 3).getValue();
    const targetEmail = BRANCH_EMAILS[branch] || "kuldeep.udhna@ginzalimited.com";
    const salesperson = sheet.getRange(row, 4).getValue();
    const total = sheet.getRange(row, 12).getValue();
    
    try {
      MailApp.sendEmail({
        to: targetEmail,
        subject: "Payment Processed - " + branch,
        body: `Payment for ${salesperson} (Total: ${total}) has been processed by ${userName} at ${timestamp}.`
      });
      sheet.getRange(row, 17).setValue("Mail Sent to " + targetEmail);
    } catch (err) {
      sheet.getRange(row, 17).setValue("Mail Failed: " + err.toString());
    }
  }

  // Payment Release (Column R / 18)
  if (col === 18 && row > 1 && value === "Payment Release") {
    sheet.getRange(row, 19).setValue(userName + " - " + timestamp);
    
    const salesperson = sheet.getRange(row, 4).getValue();
    const total = sheet.getRange(row, 12).getValue();
    
    try {
      MailApp.sendEmail({
        to: ARVIND_EMAIL,
        subject: "Payment Released - " + salesperson,
        body: `Payment of ${total} for ${salesperson} has been released by ${userName} at ${timestamp}.`
      });
    } catch (err) {
      console.error("Release email failed: " + err.toString());
    }
  }
}

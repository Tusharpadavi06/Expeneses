const SPREADSHEET_ID = "1chWoPA4oh7Ss2Xy2jZmUCTDRnmcbDU8L4ojsy46mJh8";
const FOLDER_ID = "1yizrv4TsQADhOxPLMVQSvOIMrSYNqoGs";
const ARVIND_EMAIL = "tushpadavi1@gmail.com"; // User should verify this email

const BRANCH_EMAILS = {
  "Ludhiana": "kavita.acharya@ginzalimited.com",
  "Bangalore": "kuldeep.udhna@ginzalimited.com",
  "Surat": "kuldeep.udhna@ginzalimited.com",
  "Tirupur": "kuldeep.udhna@ginzalimited.com"
};

const SALESPERSON_EMAILS = {
  "Amit Korgaonkar": "amit.korgaonkar@ginzalimited.com",
  "Santosh Pachratkar": "santosh.pachratkar@ginzalimited.com",
  "Rakesh Jain": "rakesh.jain@ginzalimited.com",
  "Kamlesh Sutar": "kamlesh.sutar@ginzalimited.com",
  "Pradeep Jadhav": "pradeep.jadhav@ginzalimited.com",
  "Shiv Ratan (Shivam)": "shivginza123@gmail.com",
  "Viay Sutar": "sutarvijay70@gmail.com",
  "Rajesh Jain": "rajesh.jain@ginzalimited.com",
  "Durgesh Bhati": "durgeshbati7740@gmail.com",
  "Lalit Maroo": "lalit.delhi@ginzalimited.com",
  "Anish Jain": "anish.delhi@ginzalimited.com",
  "Suresh Nautiyal": "mukesh.delhi@ginzalimited.com",
  "Rahul Vashishtha": "sales2.delhi@ginzalimited.com",
  "Mohit Sharma": "sales1.delhi@ginzalimited.com",
  "ravindra kaushik": "ahmedabad@ginzalimited.com",
  "Balasubramanyam": "ginzabala1985@gmail.com",
  "Tarachand": "mjbhati50@gmail.com",
  "Alexander Pushkin": "tps@ginzalimited.com",
  "Subramanian": "smanianginza@gmail.com",
  "Mani Maran": "maran236@gmail.com",
  "Anil Marthe": "anil.udhna@ginzalimted.com",
  "Raghuveer Darbar": "raghuvirdarbar9@gmail.com",
  "Sailesh Pathak": "shailesh.udhna@ginzalimited.com",
  "Vanraj Darbar": "vanraj.sales@ginzalimited.com",
  "Mahesh Chandeliya": "mahesh.chandeliya@ginzalimited.com",
  "Vishal Ambhore": "vishal.ambhore@ginzalimited.com",
  "Sachin Bhosale": "sachin.bhosle@ginzalimited.com",
  "Vinay Chhajer": "vinay.chhajer@ginzalimited.com",
  "Murali Krishna": "murali.krishna@ginzalimited.com",
  "Ravi Varman": "tirupur@ginzalimited.com",
  "Piyush Baid": "piyush.baid@ginzalimited.com"
};

function getBranchSheet(ss, branchName) {
  // Fix for direct execution: if ss is not provided, open the spreadsheet
  if (!ss) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  branchName = (branchName || "Unknown Branch")
    .replace(/[\\\/\?\*\[\]]/g, "")
    .trim();

  let sheet = ss.getSheetByName(branchName);

  const headers = [
    "Timestamp", "Submission ID", "Branch Name", "Salesperson Name",
    "Expense Category", "Item Date", "From Location", "To Location",
    "Amount", "Attachment Link", "Item Remark", "Grand Total",
    "Admin Remark", "Mail Sent", "Approved", "Approved Timestamp", 
    "Payment Process", "Processed By", "Status", "Payment Release", "Released By",
    "", "", "", "", "Mail Sent to Admin"
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
    if (!currentHeaders || currentHeaders[0] !== "Timestamp" || currentHeaders.length < headers.length) {
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
        
        // Add Checkbox for Approved (Column O / 15)
        sheet.getRange(currentRow, 15).insertCheckboxes();
        
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

      // Admin Remark (M/13)
      const rangeM = sheet.getRange(startRow, 13, totalRows, 1);
      if (totalRows > 1) rangeM.merge();
      rangeM.setHorizontalAlignment("center").setVerticalAlignment("middle");

      // Mail Sent (N/14)
      const rangeN = sheet.getRange(startRow, 14, totalRows, 1);
      if (totalRows > 1) rangeN.merge();
      const ruleN = SpreadsheetApp.newDataValidation().requireValueInList(['Mail Sent'], true).build();
      rangeN.setDataValidation(ruleN)
            .setHorizontalAlignment("center")
            .setVerticalAlignment("middle");

      // Payment Process (Q/17)
      const rangeQ = sheet.getRange(startRow, 17, totalRows, 1);
      if (totalRows > 1) rangeQ.merge();
      const ruleQ = SpreadsheetApp.newDataValidation().requireValueInList(['Process Payment'], true).build();
      rangeQ.setDataValidation(ruleQ)
            .setHorizontalAlignment("center")
            .setVerticalAlignment("middle");

      // Payment Release (T/20)
      const rangeT = sheet.getRange(startRow, 20, totalRows, 1);
      if (totalRows > 1) rangeT.merge();
      const ruleT = SpreadsheetApp.newDataValidation().requireValueInList(['Payment Release'], true).build();
      rangeT.setDataValidation(ruleT)
            .setHorizontalAlignment("center")
            .setVerticalAlignment("middle");

      // Mail Sent to Admin (Z/26)
      const rangeZ = sheet.getRange(startRow, 26, totalRows, 1);
      if (totalRows > 1) rangeZ.merge();
      const ruleZ = SpreadsheetApp.newDataValidation().requireValueInList(['Mail Sent to Admin'], true).build();
      rangeZ.setDataValidation(ruleZ)
            .setHorizontalAlignment("center")
            .setVerticalAlignment("middle");
    }

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
    <p>Dear Arvind Sir / Ashok Sir,</p>
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
      subject: "Expense Report for Review - " + name,
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

  // Mail Sent to Admin (Column Z / 26)
  if (col === 26 && row > 1 && value === "Mail Sent to Admin") {
    const salesperson = sheet.getRange(row, 4).getValue();
    const total = sheet.getRange(row, 12).getValue();
    const branch = sheet.getRange(row, 3).getValue();
    
    sendArvindReviewEmail(sheet, row, total, salesperson, branch);
    sheet.getRange(row, 19).setValue("Review Mail Sent to Admin");
  }

  // Mail Sent (Column N / 14)
  if (col === 14 && row > 1 && value === "Mail Sent") {
    const salesperson = sheet.getRange(row, 4).getValue();
    const targetEmail = SALESPERSON_EMAILS[salesperson];
    const remark = sheet.getRange(row, 13).getValue();
    const total = sheet.getRange(row, 12).getValue();
    const branch = sheet.getRange(row, 3).getValue();

    if (targetEmail) {
      try {
        MailApp.sendEmail({
          to: targetEmail,
          subject: "Expense Report Update - " + branch,
          body: `Dear ${salesperson},\n\nYour expense report for ${branch} (Total: ${total}) has been reviewed.\n\nRemark: ${remark}\n\nProcessed by: ${userName} at ${timestamp}.`
        });
        sheet.getRange(row, 19).setValue("Mail Sent to Salesperson");
      } catch (err) {
        sheet.getRange(row, 19).setValue("Mail Failed: " + err.toString());
      }
    } else {
      sheet.getRange(row, 19).setValue("Error: Email not found for " + salesperson);
    }
  }

  // Approved Checkbox (Column O / 15)
  if (col === 15 && row > 1) {
    if (value === "TRUE") {
      sheet.getRange(row, 16).setValue(userName + " - " + timestamp);
    } else {
      sheet.getRange(row, 16).clearContent();
    }
  }

  // Payment Process (Column Q / 17)
  if (col === 17 && row > 1 && value === "Process Payment") {
    sheet.getRange(row, 18).setValue(userName + " - " + timestamp);
    
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
      sheet.getRange(row, 19).setValue("Mail Sent to " + targetEmail);
    } catch (err) {
      sheet.getRange(row, 19).setValue("Mail Failed: " + err.toString());
    }
  }

  // Payment Release (Column T / 20)
  if (col === 20 && row > 1 && value === "Payment Release") {
    sheet.getRange(row, 21).setValue(userName + " - " + timestamp);
    
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

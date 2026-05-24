function sendRetentionEmail(e) {
  const sheet = e.source.getActiveSheet();
  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();
  
  // Trigger strictly on Column M (13). Ignore header row (1).
  if (col !== 13 || row === 1) return;
  
  try {
    // Fetch columns A through S for the active row (19 columns total)
    const rowData = sheet.getRange(row, 1, 1, 19).getValues()[0];
    const sheetName = sheet.getName();
    
    // Mandatory check array mapping (0-based index matching columns A-R)
    const mandatoryIndexes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16];
    
    for (let i = 0; i < mandatoryIndexes.length; i++) {
      const index = mandatoryIndexes[i];
      const val = rowData[index];
      if (val === "" || val === null || val === undefined) {
        throw new Error(`Mandatory Column ${String.fromCharCode(65 + index)} is empty.`);
      }
    }
    
    // Map values to variables
    const colB = rowData[1];  // Project
    const colD = rowData[3];  // Vendor Name
    const colE = rowData[4];  // PO Number
    const colH = rowData[7];  // Scope of Work
    const colI = rowData[8];  // Type of Work
    const colL = rowData[11]; // Retention Period
    const rawM = rowData[12]; // Due Date Retention
    const rawN = rowData[13]; // End Date Retention
    const colP = rowData[15]; // Retention Defect List link
    const colQ = rowData[16]; // Recipient Email (To)
    const colR = rowData[17]; // CC Email (Optional)

    // Validate Date structure for columns M and N
    if (!(rawM instanceof Date) || isNaN(rawM) || !(rawN instanceof Date) || isNaN(rawN)) {
      throw new Error("Column M or N does not contain a valid sheet date format.");
    }

    // Format Dates to dd-mmm-yyyy
    const dateMStr = formatDate(rawM);
    const dateNStr = formatDate(rawN);
    
    // Calculate billing deadline: Column M + 6 months
    const deadlineDate = new Date(rawM.getTime());
    deadlineDate.setMonth(deadlineDate.getMonth() + 6);
    const deadlineStr = formatDate(deadlineDate);

    // Parse recipient emails safely
    const toEmails = colQ.toString().replace(/;/g, ',');
    
    // Build standard mail options block
    const subject = `Retention Period Information – Project ${colB} ${sheetName}`;
    const htmlBody = `
      <p>Dear Team,</p>
      <p>We hereby inform you that the project ${colB} ${sheetName} handled by ${colD} has completed the Project Handover and has entered the retention period, with the following details</p>
      
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif; min-width: 400px;">
        <tr>
          <td style="font-weight: bold; background-color: #f2f2f2; width: 40%;">Vendor Name</td>
          <td>${colD}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f2f2f2;">Scope of Work</td>
          <td>${colH}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f2f2f2;">Type of Work</td>
          <td>${colI}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f2f2f2;">PO Number</td>
          <td>${colE}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f2f2f2;">Due Date Retention</td>
          <td style="color: #0000FF; font-weight: bold;">${dateMStr}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f2f2f2;">End Date Retention</td>
          <td style="color: #FF0000; font-weight: bold;">${dateNStr}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f2f2f2;">Retention Period</td>
          <td>${colL}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f2f2f2;">Vendor Retention Billing Deadlines (Exp. Administrative Submission)</td>
          <td style="font-weight: bold;">${deadlineStr}</td>
        </tr>
      </table>
      
      <p>Please find attached the Retention Defect List form:<br>
      <a href="${colP}">${colP}</a></p>
      
      <p>This information is provided so that all parties can adjust their activities in accordance with the retention period.</p>
      <p>Thank you for your attention and cooperation.</p>
      <p>Regards,<br>Document Control</p>
    `;

    const mailOptions = {
      htmlBody: htmlBody
    };

    if (colR && colR.toString().trim() !== "") {
      mailOptions.cc = colR.toString().replace(/;/g, ',');
    }

    // Send the email
    GmailApp.sendEmail(toEmails, subject, "", mailOptions);
    
    // On Success: Write timestamp
    const timestamp = Utilities.formatDate(new Date(), e.source.getSpreadsheetTimeZone(), "dd-MMM-yyyy HH:mm:ss");
    sheet.getRange(row, 19).setValue(timestamp);
    
  } catch (error) {
    const errorLog = `FAILED: ${error.message}`;
    sheet.getRange(row, 19).setValue(errorLog);
    console.error(errorLog);
    
    // Dispatch Failure Notification Alert Email to Admin
    const adminEmail = 'your-email@domain.com'; // CHANGE THIS TO YOUR ACTUAL EMAIL ADDRESS
    const failureSubject = `ALERT: Retention Email Failed for Row ${row}`;
    const failureBody = `
      <p>Hello,</p>
      <p>The automated retention system failed to execute for row <strong>${row}</strong>.</p>
      <p><strong>Error Details:</strong> <span style="color: red;">${error.message}</span></p>
      <br>
      <p>Please review the row data structure in your spreadsheet.</p>
      <p>Regards,<br>Automated System Error Handler</p>
    `;
    
    try {
      GmailApp.sendEmail(adminEmail, failureSubject, "", { htmlBody: failureBody });
    } catch (innerError) {
      console.log(`Failed to dispatch alert notification email: ${innerError.message}`);
    }
  }
}

function formatDate(dateObj) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(dateObj.getDate()).padStart(2, '0');
  const monthStr = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day}-${monthStr}-${year}`;
}

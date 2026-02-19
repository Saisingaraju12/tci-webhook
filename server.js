const express = require("express");
const { google } = require("googleapis");

const app = express();
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/", (req, res) => res.status(200).send("OK - TCI webhook is live"));

app.post("/", async (req, res) => {
  try {
    const SHEET_ID = process.env.SHEET_ID;
    const SHEET_TAB = process.env.SHEET_TAB || "Main";
    const KEYFILE = process.env.GOOGLE_APPLICATION_CREDENTIALS; // /secrets/sa.json

    if (!SHEET_ID || !KEYFILE) {
      console.log("Missing env vars");
      return res.status(500).send("Missing env vars");
    }

    // For testing (your curl payload)
    const docket = (req.body?.docket_number || "").toString().trim();
    const pincode = (req.body?.destination_pincode || "").toString().trim();
    const location = (req.body?.destination_location || "").toString().trim();
    const status = (req.body?.status || "").toString().trim();
    const bookingDate = (req.body?.booking_date || "").toString().trim();
    const expectedDelivery = (req.body?.expected_delivery_date || "").toString().trim();
    const deliveryDate = (req.body?.delivery_date || "").toString().trim();
    const arrivalDate = (req.body?.arrival_date || "").toString().trim();
    const packets = (req.body?.packets || "").toString().trim();
    const weight = (req.body?.weight || "").toString().trim();
    const podLink = (req.body?.pod_link || "").toString().trim();

    if (!docket) return res.status(200).send("No docket_number");

    // Auth
    const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILE,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

    // Find docket in Column A
    const colA = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A:A`,
    });

    const rows = colA.data.values || [];
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      const cell = (rows[i]?.[0] || "").toString().trim();
      if (cell === docket) {
        rowIndex = i;
        break;
      }
    }

    // If not found, append new row with docket
    if (rowIndex === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_TAB}!A:A`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [[docket]] },
      });

      const colA2 = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_TAB}!A:A`,
      });
      rowIndex = (colA2.data.values || []).length - 1;
    }

    const sheetRow = rowIndex + 1; // 1-based row number

    // Update B..K as per your headers
    // A Docket Number
    // B Destination Pincode
    // C Destination Location
    // D Status
    // E Booking Date
    // F Expected Delivery Date
    // G Delivery Date / Attempted Date
    // H Arrival Date
    // I Packets
    // J Weight
    // K POD Copy link
    const values = [[
      pincode,        // B
      location,       // C
      status,         // D
      bookingDate,    // E
      expectedDelivery,// F
      deliveryDate,   // G
      arrivalDate,    // H
      packets,        // I
      weight,         // J
      podLink         // K
    ]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!B${sheetRow}:K${sheetRow}`,
      valueInputOption: "RAW",
      requestBody: { values },
    });

    return res.status(200).send("Updated");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

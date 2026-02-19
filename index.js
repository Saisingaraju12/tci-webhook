const express = require("express");
const { google } = require("googleapis");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("TCI Webhook Running");
});

app.post("/", async (req, res) => {
  try {
    const SHEET_ID = process.env.SHEET_ID;
    const SHEET_TAB = "Main";
    const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
    const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

    const { docket_number, status, delivery_date, arrival_date, pod_link } = req.body;

    if (!docket_number) {
      return res.status(200).send("No docket number");
    }

    const auth = new google.auth.JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A:A`,
    });

    const rows = read.data.values || [];
    let rowIndex = rows.findIndex(r => r[0] === docket_number);

    if (rowIndex === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_TAB}!A:A`,
        valueInputOption: "RAW",
        requestBody: { values: [[docket_number]] },
      });

      const reRead = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_TAB}!A:A`,
      });

      rowIndex = reRead.data.values.length - 1;
    }

    const sheetRow = rowIndex + 1;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!D${sheetRow}:K${sheetRow}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          status || "",
          "",
          delivery_date || "",
          arrival_date || "",
          "",
          "",
          pod_link || ""
        ]]
      }
    });

    res.status(200).send("Updated");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Running on ${PORT}`));

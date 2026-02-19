const express = require("express");
const { google } = require("googleapis");

const app = express();
app.use(express.json());

const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = "Main";

const auth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

app.post("/tci-webhook", async (req, res) => {
  try {
    const data = req.body;

    const docket = data.docket_number;
    const status = data.status;
    const deliveryDate = data.delivery_date;
    const arrivalDate = data.arrival_date;
    const podLink = data.pod_link;

    if (!docket) {
      return res.status(400).send("No docket number");
    }

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A2:A`,
    });

    const rows = response.data.values || [];
    let rowIndex = -1;

    rows.forEach((row, index) => {
      if (row[0] == docket) {
        rowIndex = index + 2;
      }
    });

    if (rowIndex > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!D${rowIndex}:K${rowIndex}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[status, "", deliveryDate, arrivalDate, "", "", podLink]],
        },
      });
    }

    res.status(200).json({ message: "Updated" });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

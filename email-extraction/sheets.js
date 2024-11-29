import { google } from 'googleapis';
import { Nango } from '@nangohq/node';

// Create a Nango client with your secret key
const nango = new Nango({ secretKey: process.env.NANGO_KEY });

// Fetch the access token for google sheets
const user = await nango.getConnection('INTEGRATION-ID', 'CONNECTION-ID');

// Google Sheets client setup
export async function sendToGoogleSheets(data) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
        access_token: user.credentials.access_token
    });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // Flatten the data and prepare it for insertion into Google Sheets
    const rows = [];

    data.forEach((entry) => {
        entry.Items.forEach((item) => {
            // Prepare a row of data for each item in the Items array
            const row = [
                item.purchaseNo,   // Purchase number
                entry.senderName,  // Sender's name
                entry.senderEmail, // Sender's email
                item.pickupLocation, // Pickup location
                item.destinationLocation, // Destination location
                item.itemName,     // Item name
                item.weight,       // Weight
                item.quantity,     // Quantity
                item.shippingDate  // Shipping date
            ];
            rows.push(row); // Add the row to the array
        });
    });

    const request = {
        spreadsheetId: '<SPREADSHEET-ID>', // Replace with your Google Sheets ID
        range: 'Sheet1!A2',  // The range in the sheet where the data should start (automatically appends)
        valueInputOption: 'RAW',  // Insert raw values (no formatting)
        resource: {
            values: rows,  // Insert the rows we prepared earlier
        },
    };

    try {
        const response = await sheets.spreadsheets.values.append(request);
        console.log('Data sent to Google Sheets:', response.data);
    } catch (error) {
        console.error('Error sending data to Google Sheets:', error);
    }
}
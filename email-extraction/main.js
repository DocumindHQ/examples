import { fetchUnprocessedEmailsWithAttachments } from './gmail.js';
import { uploadPDFToSupabase } from './supabase.js';
import { extractPDFData } from './extractor.js';
import { sendToGoogleSheets } from './sheets.js';

//Documind Schema
const schema = [
    {
        "name": "Items",
        "type": "array",
        "description": "List of items to be shipped",
        "children": [
        {
         "name": "purchaseNo",
         "type": "string",
         "description": "Purchase or order number for the item."
        },
        {
         "name": "itemName",
         "type": "string",
         "description": "Name of the item being shipped."
        },
        {
          "name": "pickupLocation",
          "type": "string",
          "description": "City where the shippment will be picked up."
        },
        {
          "name": "destinationLocation",
          "type": "string",
          "description": "City where the item will be shipped to."
        },
        {
          "name": "weight",
          "type": "number",
          "description": "Weight of the item"
        },
        {
          "name": "quantity",
          "type": "number",
          "description": "Quantity of the item"
        },
        {
          "name": "shippingDate",
          "type": "string",
          "description": "Date the item will be shipped written in format DD/MM/YYYY"
        }
        ]
    }
]

async function processEmails() {
    try {
        // Fetch unprocessed emails with PDF attachments
        const emails = await fetchUnprocessedEmailsWithAttachments();

        const processedResults = [];

        // Process each email
        for (const email of emails) {
            for (const attachment of email.attachments) {
                try {
                    // Upload to Supabase
                    const signedUrl = await uploadPDFToSupabase(attachment);

                    // Extract data
                    const extractionResult = await extractPDFData(signedUrl, schema);

                    // Append sender information
                    const finalResult = {
                        ...extractionResult.data,
                        senderName: email.senderName,
                        senderEmail: email.senderEmail
                    };

                    processedResults.push(finalResult);

                    // Send the data to Google Sheets
                    await sendToGoogleSheets(processedResults);
                } catch (error) {
                    console.error('Error processing email attachment:', error);
                }
            }
        }

        return processedResults;
    } catch (error) {
        console.error('Error in email processing:', error);
        return [];
    }
}

// For testing
(async () => {
    const results = await processEmails();
    console.log('Processed Results:', JSON.stringify(results, null, 2));
})();

// Set up a polling interval (every minute)
// setInterval(async () => {
//     const results = await processEmails();
//     console.log('Processed Results:', JSON.stringify(results, null, 2));
// }, 60000); // Poll every 60,000ms (1 minute)
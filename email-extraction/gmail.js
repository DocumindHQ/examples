import { google } from 'googleapis';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Nango } from '@nangohq/node';

// Create a Nango client with your secret key
const nango = new Nango({ secretKey: process.env.NANGO_KEY });

// Fetch the access token for gmail
const user = await nango.getConnection('INTEGRATION-ID', '<CONNECTION-ID>');

function createGmailClient() {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
        access_token: user.credentials.access_token
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
}

//Create/get the processed label
async function addProcessedLabel(gmail) {
    try {
        // First, check if the label exists
        const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
        const existingLabels = labelsResponse.data.labels;
        
        let processedLabel = existingLabels.find(label => label.name === 'Processed');
        
        // If processed label doesn't exist, create it
        if (!processedLabel) {
            const createLabelResponse = await gmail.users.labels.create({
                userId: 'me',
                requestBody: {
                    name: 'Processed',
                    labelListVisibility: 'labelShow',
                    messageListVisibility: 'show'
                }
            });
            processedLabel = createLabelResponse.data;
        }

        return processedLabel.id;
    } catch (error) {
        console.error('Error creating/finding processed label:', error);
        throw error;
    }
}

// Fetch all unprocessed emails with attachments
export async function fetchUnprocessedEmailsWithAttachments() {
    try {
        const gmail = createGmailClient();

        // List all unprocessed emails with attachments
        const listResponse = await gmail.users.messages.list({
            userId: 'me',
            labelIds: ['INBOX'],
            q: 'has:attachment -label:processed',
            maxResults: 5
        });

        const messages = listResponse.data.messages;
        if (!messages || messages.length === 0) {
            console.log('No unprocessed emails with attachments found.');
            return [];
        }

        // Get or create the label
        const processedLabelId = await addProcessedLabel(gmail);

        // Fetch details for each email
        const emailsWithAttachments = [];

        for (const message of messages) {
            // Get the full details of the email
            const messageResponse = await gmail.users.messages.get({
                userId: 'me',
                id: message.id,
                format: 'full'
            });

            const emailMessage = messageResponse.data;

            // Extract sender information
            let senderEmail = '';
            let senderName = '';
            const headers = emailMessage.payload.headers;
            const fromHeader = headers.find(header => header.name === 'From');
            if (fromHeader) {
                const fromParts = fromHeader.value.match(/^(.*?)\s*<(.+?)>$/);
                if (fromParts) {
                    senderName = fromParts[1].trim().replace(/^"|"$/g, '');
                    senderEmail = fromParts[2];
                } else {
                    senderEmail = fromHeader.value;
                }
            }

            const attachments = [];

            // Extract attachments
            const parts = emailMessage.payload.parts || [];

            for (const part of parts) {
                // Only process PDF attachments
                if (part.filename && 
                    part.filename.toLowerCase().endsWith('.pdf') && 
                    part.body.attachmentId) {
                    
                    // Download the attachment
                    const attachmentResponse = await gmail.users.messages.attachments.get({
                        userId: 'me',
                        messageId: message.id,
                        id: part.body.attachmentId
                    });

                    const attachmentData = attachmentResponse.data;
                    
                    // Decode base64 attachment
                    const buffer = Buffer.from(attachmentData.data, 'base64');

                    // Save attachment to a file 
                    const filename = part.filename;
                    const filepath = path.join(process.cwd(), 'downloads', filename);
                    
                    // Ensure downloads directory exists
                    fs.mkdirSync(path.join(process.cwd(), 'downloads'), { recursive: true });
                    
                    fs.writeFileSync(filepath, buffer);

                    attachments.push({
                        filename: filename,
                        filepath: filepath,
                        buffer: buffer
                    });

                    // Break after first pdf attachment
                    break;
                }
            }

            // Only add if PDF attachment found
            if (attachments.length > 0) {
                // Modify the message labels to mark as processed
                await gmail.users.messages.modify({
                    userId: 'me',
                    id: message.id,
                    requestBody: {
                        addLabelIds: [processedLabelId],
                    }
                });

                emailsWithAttachments.push({
                    messageId: message.id,
                    senderEmail,
                    senderName,
                    attachments: attachments
                });
            }
        }

        return emailsWithAttachments;

    } catch (error) {
        console.error('Failed to fetch emails:', error);
        return [];
    }
}
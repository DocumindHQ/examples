import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_API_KEY
);

export async function uploadPDFToSupabase(attachment) {
    try {
        // Generate a unique filename
        const uniqueFilename = `${Date.now()}_${attachment.filename}`;

        // Upload the file
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('pdfAttachments') // Replace with your bucket name
            .upload(uniqueFilename, attachment.buffer, {
                contentType: 'application/pdf'
            });

        if (uploadError) throw uploadError;

        // Create a signed URL that expires in 1 hour (3600 seconds)
        const { data: { signedUrl }, error: signedUrlError } = await supabase.storage
            .from('pdfAttachments')
            .createSignedUrl(uniqueFilename, 3600);

        if (signedUrlError) throw signedUrlError;

        return signedUrl;
    } catch (error) {
        console.error('Supabase upload error:', error);
        throw error;
    }
}
import { extract } from 'documind';

export async function extractPDFData(pdfUrl, schema) {
    try {
        const result = await extract({
            file: pdfUrl,
            schema
        });

        return result;
    } catch (error) {
        console.error('Extraction error:', error);
        throw error;
    }
}
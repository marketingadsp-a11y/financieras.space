
'use server';

interface SendSmsParams {
    to: string;
    message: string;
    sender?: string;
    username: string;
    apiToken: string;
}

interface LabsMobileResponse {
    code: number;
    message: string;
}

export async function sendSms({ to, message, sender, username, apiToken }: SendSmsParams): Promise<LabsMobileResponse> {

    if (!username || !apiToken) {
        throw new Error("LabsMobile username or API token is missing.");
    }
    
    const endpoint = 'https://api.labsmobile.com/json/send';
    
    const credentials = `${username}:${apiToken}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');
    
    const payload = {
        messages: [{
            tpoa: sender || 'Sender', 
            msisdn: [to], 
            message: message,
        }]
    };
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${encodedCredentials}`
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            // Read the body as text first to avoid "body already read" errors.
            const errorText = await response.text();
            let errorMessage = errorText;
            try {
                // Try to parse it as JSON to get a more specific message if available.
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorText;
            } catch (e) {
                // Ignore if it's not JSON, we already have the text.
            }
             throw new Error(`LabsMobile API Error: ${response.status} ${response.statusText} - ${errorMessage}`);
        }
        
        const result: LabsMobileResponse = await response.json();
        return result;

    } catch (error: any) {
        console.error('Failed to send SMS via LabsMobile:', error);
        throw new Error(error.message || 'An unexpected error occurred while sending the SMS.');
    }
}


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
    
    // Correct payload structure for LabsMobile API.
    // The API expects the message content inside a "messages" array.
    const payload = {
        messages: [{
            tpoa: sender || 'Sender', // Originator, up to 11 alphanumeric chars
            msisdn: [to], // The recipient must be in an array
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
            let errorBody;
            try {
                errorBody = await response.json();
            } catch (e) {
                // If the error response is not JSON, use the status text.
                 const textResponse = await response.text();
                 errorBody = { message: textResponse || 'Unknown error structure.' };
            }
             throw new Error(`LabsMobile API Error: ${response.status} ${response.statusText} - ${errorBody?.message}`);
        }
        
        const result: LabsMobileResponse = await response.json();
        return result;

    } catch (error: any) {
        console.error('Failed to send SMS via LabsMobile:', error);
        throw new Error(error.message || 'An unexpected error occurred while sending the SMS.');
    }
}

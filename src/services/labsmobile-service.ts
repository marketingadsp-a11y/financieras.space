
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
                'Accept': 'application/json',
                'Authorization': `Basic ${encodedCredentials}`
            },
            body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        
        if (!response.ok) {
            let errorMessage = `Error ${response.status}: ${response.statusText}`;
            try {
                const errorJson = JSON.parse(responseText);
                errorMessage = `(${errorJson.code}) ${errorJson.message}`;
            } catch (e) {
                // If parsing fails, it might be an HTML error page or plain text.
                // We keep the original error message but append the body for context.
                errorMessage += ` - ${responseText}`;
            }
            throw new Error(`LabsMobile API Error: ${errorMessage}`);
        }
        
        const resultJson = JSON.parse(responseText);
        return resultJson;

    } catch (error: any) {
        console.error('Failed to send SMS via LabsMobile:', error);
        throw new Error(error.message || 'An unexpected error occurred while sending the SMS.');
    }
}

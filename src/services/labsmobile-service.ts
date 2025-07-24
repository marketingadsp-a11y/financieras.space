
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
    
    // Correct payload structure according to LabsMobile JSON API documentation
    const payload = {
      messages: [
        {
          tpoa: sender || 'Sender',
          msisdn: [to], // msisdn must be an array of strings
          message: message,
        },
      ],
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

        const responseText = await response.text();
        
        if (!response.ok) {
            let errorMessage = responseText;
            try {
                // Try to parse as JSON, but use text if it fails
                const errorJson = JSON.parse(responseText);
                errorMessage = errorJson.message || JSON.stringify(errorJson);
            } catch (e) {
                // Not a JSON error response, use the raw text.
            }
             throw new Error(`LabsMobile API Error: ${response.status} ${response.statusText} - ${errorMessage}`);
        }
        
        const result: LabsMobileResponse = JSON.parse(responseText);
        return result;

    } catch (error: any) {
        console.error('Failed to send SMS via LabsMobile:', error);
        throw new Error(error.message || 'An unexpected error occurred while sending the SMS.');
    }
}

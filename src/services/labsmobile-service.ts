
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
            msisdn: [to], // Ensure 'to' is wrapped in an array
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

        const responseText = await response.text();
        
        if (!response.ok) {
            let errorMessage = responseText;
            try {
                // Try to parse as JSON to get a cleaner error message
                const errorJson = JSON.parse(responseText);
                if (errorJson.subaccounts && errorJson.subaccounts[0]) {
                     errorMessage = errorJson.subaccounts[0].message;
                } else {
                     errorMessage = errorJson.message || JSON.stringify(errorJson);
                }
            } catch (e) {
                // Response was not JSON, use the raw text.
            }
             throw new Error(`LabsMobile API Error: ${response.status} ${response.statusText} - ${errorMessage}`);
        }
        
        // Assuming success response might also have a nested structure
        const resultJson = JSON.parse(responseText);
        if (resultJson.subaccounts && resultJson.subaccounts[0]) {
            return resultJson.subaccounts[0];
        }

        return resultJson;

    } catch (error: any) {
        console.error('Failed to send SMS via LabsMobile:', error);
        throw new Error(error.message || 'An unexpected error occurred while sending the SMS.');
    }
}

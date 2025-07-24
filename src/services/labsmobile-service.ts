
'use server';

interface SendSmsParams {
    to: string;
    message: string;
    sender?: string;
}

interface LabsMobileResponse {
    code: number;
    message: string;
}

export async function sendSms({ to, message, sender }: SendSmsParams): Promise<LabsMobileResponse> {
    const username = process.env.LABSMOBILE_USERNAME;
    const token = process.env.LABSMOBILE_TOKEN;

    if (!username || !token) {
        throw new Error("LabsMobile credentials are not configured in the environment variables.");
    }
    
    const endpoint = 'https://api.labsmobile.com/json/send';
    
    const payload = {
        username: username,
        token: token,
        messages: [
            {
                tpoa: sender || 'Sender', // Originator, up to 11 alphanumeric chars
                msisdn: to,
                message: message,
            }
        ]
    };
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            // Try to get error details from LabsMobile response if possible
            let errorBody;
            try {
                errorBody = await response.json();
            } catch (e) {
                errorBody = { message: 'Unknown error structure.' };
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

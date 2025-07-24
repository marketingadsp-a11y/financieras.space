
'use server';

import { Resend } from 'resend';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  from = 'onboarding@resend.dev', // Default "from" address, can be overridden
}: SendEmailParams): Promise<{ success: boolean; message: string }> {
  
  if (!process.env.RESEND_API_KEY) {
    console.error("Resend API key is not set in environment variables.");
    return { success: false, message: "La configuración del servidor de correo está incompleta (falta la clave de API de Resend)." };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Error sending email via Resend:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: "Correo enviado correctamente." };
  } catch (error) {
    console.error('Failed to send email:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage || 'Ocurrió un error inesperado al enviar el correo.' };
  }
}

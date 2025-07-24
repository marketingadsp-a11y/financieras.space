"use server";

import { Resend } from 'resend';

type SendEmailParams = {
  to: string[];
  subject: string;
  text: string;
  from: string;
};

export async function sendEmail({ to, subject, text, from }: SendEmailParams): Promise<{ success: boolean; message: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("Resend API Key is not configured in .env file.");
    return { success: false, message: "La API Key de Resend no está configurada." };
  }
  
  const resend = new Resend(resendApiKey);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      text,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, message: error.message || "Error desconocido de Resend." };
    }

    console.log("Email sent successfully:", data);
    return { success: true, message: "Correo enviado exitosamente." };
  } catch (e: any) {
    console.error("Error sending email:", e);
    return { success: false, message: e.message || "Fallo el envío de correo sin un mensaje específico" };
  }
}

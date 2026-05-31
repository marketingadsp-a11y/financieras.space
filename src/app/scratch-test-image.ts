import { ai } from '../ai/genkit';
import * as dotenv from 'dotenv';
dotenv.config();

// Standard 1x1 pixel base64 GIF as test logo
const testBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

async function run() {
  try {
    console.log("Generating image with multi-image fusion...");
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image',
      prompt: [
        { text: 'Genera una tarjeta de felicitación alegre de cumpleaños para un colaborador de la empresa, que tenga mucho confeti y globos de fiesta en el fondo. Integra este logotipo corporativo de forma elegante y este personaje mascota para que celebre el cumpleaños.' },
        { media: { url: testBase64, contentType: 'image/gif' } },
        { media: { url: testBase64, contentType: 'image/gif' } }
      ]
    });
    const media = response.media;
    if (media) {
      console.log("Fusion Success! Media content type:", media.contentType);
      console.log("Media URL starts with:", media.url?.substring(0, 100));
    } else {
      console.log("No media returned in response.");
    }
  } catch (error) {
    console.error("Error generating fusion image:", error);
  }
}

run();

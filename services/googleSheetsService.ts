
import { FormData } from '../types';

// Convert File object to Base64 string for transmission
const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string; name: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        base64: base64String,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Submits the form data to the Google Apps Script Web App
 */
export const submitToGoogleSheets = async (data: FormData): Promise<boolean> => {
  try {
    // The user-provided deployment link
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxVBgR3gN-XLimGVwFEH5gFjNPFVpPNdR7yjstwxCPyKobg786kfEWDwIncYrvrcE8axQ/exec';

    // Process entries to convert attachments to Base64
    const processedData = { ...data };

    const convertEntries = async (entries: any[]) => {
      if (!entries) return [];
      return Promise.all(entries.map(async (entry) => {
        if (entry.attachment instanceof File) {
          const attachmentData = await fileToBase64(entry.attachment);
          return { ...entry, attachment: attachmentData };
        }
        return { ...entry, attachment: null };
      }));
    };

    processedData.travelEntries = await convertEntries(data.travelEntries);
    processedData.foodEntries = await convertEntries(data.foodEntries);
    processedData.accommodationEntries = await convertEntries(data.accommodationEntries);
    processedData.otherEntries = await convertEntries(data.otherEntries);

    // Using fetch with 'no-cors' as per Google Apps Script requirements for standard POST redirects
    await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(processedData)
    });

    // With 'no-cors', we assume success if no exception is thrown
    return true;
  } catch (error) {
    console.error("Error submitting to Google Sheets:", error);
    return false;
  }
};

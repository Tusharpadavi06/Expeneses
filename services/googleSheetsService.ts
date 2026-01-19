
import { FormData } from '../types';

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

export const submitToGoogleSheets = async (data: FormData): Promise<boolean> => {
  try {
    // This is the specific URL you provided
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxVBgR3gN-XLimGVwFEH5gFjNPFVpPNdR7yjstwxCPyKobg786kfEWDwIncYrvrcE8axQ/exec';

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

    // Using text/plain to avoid CORS preflight errors with Google Apps Script
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(processedData)
    });

    // With no-cors, we can't check response.ok, so we assume success if no error is thrown
    return true;
  } catch (error) {
    console.error("Submission failed:", error);
    return false;
  }
};

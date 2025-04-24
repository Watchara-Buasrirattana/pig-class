import type { NextApiRequest, NextApiResponse } from 'next';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { formidable } from 'formidable'; // Using formidable v3+
import { v4 as uuidv4 } from 'uuid'; // For generating unique names
import fs from 'fs'; // Node.js file system module

// --- Configuration ---
// ควรเก็บไว้ใน Environment Variables (.env.local)
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'courseimages'; // Your container name

if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error('Azure Storage Connection String is not configured in environment variables.');
}

// --- Azure Blob Service Client ---
let blobServiceClient: BlobServiceClient | null = null;
let containerClient: ContainerClient | null = null;

function getContainerClient(): ContainerClient {
  if (!blobServiceClient) {
    blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING!);
  }
  if (!containerClient) {
     containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
     // Optional: Create container if it doesn't exist (run once or handle creation separately)
     // containerClient.createIfNotExists({ access: 'blob' }); // Set public access level if needed
  }
  return containerClient;
}

// --- API Handler Configuration ---
export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parsing, formidable will handle it
  },
};

// --- API Route Logic ---
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const form = formidable({}); // Initialize formidable

    // Parse the incoming form data (including the file)
    const [fields, files] = await form.parse(req);

    const fileArray = files.file; // 'file' is the key used in formData.append('file', imageFile)

    if (!fileArray || fileArray.length === 0) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    // Assuming single file upload with key 'file'
    const file = fileArray[0];

    if (!file) {
        return res.status(400).json({ error: 'File data is missing.' });
    }

    // Generate a unique blob name
    const fileExtension = file.originalFilename?.split('.').pop() || 'tmp';
    const blobName = `${uuidv4()}.${fileExtension}`;

    // Get Azure container client
    const client = getContainerClient();
    const blockBlobClient = client.getBlockBlobClient(blobName);

    // Create a readable stream from the temporary file path
    const fileStream = fs.createReadStream(file.filepath);

    // Upload the file stream to Azure Blob Storage
    const uploadBlobResponse = await blockBlobClient.uploadStream(
        fileStream,
        undefined, // bufferSize
        undefined, // maxConcurrency
        {
            blobHTTPHeaders: { blobContentType: file.mimetype || 'application/octet-stream' }
        }
    );

    console.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);

     // Clean up the temporary file created by formidable
     await fs.promises.unlink(file.filepath);


    // Construct the public URL (ensure your container has public access or use SAS tokens)
    const blobUrl = blockBlobClient.url;

    // Return the public URL of the uploaded file
    return res.status(200).json({ url: blobUrl });

  } catch (error) {
    console.error('Upload failed:', error);
    // Clean up temp file in case of error during upload if path exists
     if (error && typeof error === 'object' && 'filepath' in error && typeof error.filepath === 'string') {
        try { await fs.promises.unlink(error.filepath); } catch (cleanupError) { console.error("Cleanup failed:", cleanupError); }
     }
    return res.status(500).json({ error: 'Failed to upload image.', details: error instanceof Error ? error.message : String(error) });
  }
}
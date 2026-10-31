import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { RateLimitError, clientIp, rateLimit } from "@/lib/rate-limit";

// Public artwork uploads for custom tents. Files go straight from the browser
// to Blob storage under custom-artwork/, with type, size and rate limits.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "Bad upload request" }, { status: 400 });
  const ip = clientIp(req);
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("custom-artwork/")) throw new Error("Uploads must go to custom-artwork/");
        await rateLimit("artwork-upload", ip, 20, 3600_000, "Too many uploads from this connection. Try again in an hour.");
        return {
          allowedContentTypes: [
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/svg+xml",
            "application/pdf",
            "application/postscript",
            "application/illustrator",
            "image/vnd.adobe.photoshop",
          ],
          maximumSizeInBytes: 25 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    const status = e instanceof RateLimitError ? 429 : 400;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status });
  }
}

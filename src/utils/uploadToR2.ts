export async function uploadFilesToR2(
  files: File[],
  clientName = "frontend",
  fileKind = "image"
): Promise<string[]> {
  if (!files || !files.length) return [];

  const results: string[] = [];

  for (const file of files) {
    try {
      const queryParams = new URLSearchParams({
        fileName: file.name,
        fileType: file.type,
        clientName,
        fileKind,
      });

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/presigned-url?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to get presigned URL");

      const { uploadUrl, fileUrl, signedGetUrl } = await res.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!putRes.ok) throw new Error("Upload to R2 failed");

      // prefer signed GET URL if backend provided it (works even when bucket is private)
      results.push(signedGetUrl || fileUrl);
    } catch (err) {
      // log and continue
      // eslint-disable-next-line no-console
      console.error("uploadFilesToR2 error for file", (file && file.name) || "(unknown)", err);
    }
  }

  return results;
}

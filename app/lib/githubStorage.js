// app/lib/githubStorage.js - GitHub Repository & jsDelivr Global Edge CDN Storage Engine
// Uploads dish photography and marketing assets to GitHub and serves them over jsDelivr CDN
// Eliminates heavy base64 strings in the database, reducing egress and transfer costs to 0.

import fs from 'fs';
import path from 'path';

export async function uploadToGitHubCdn({
  buffer = null,
  base64Data = '',
  filename = '',
  dishTitle = '',
  category = '',
  mealSection = '',
  repoOverride = '',
  folder = 'dishes',
  mimeType = 'image/webp',
}) {
  const token = (process.env.GITHUB_TOKEN || '').trim();
  const owner = (process.env.GITHUB_OWNER || 'srigokulamvegrestaurant').trim();
  const branch = (process.env.GITHUB_BRANCH || 'main').trim();

  // Smart Repository Router based on Meal Section or Category
  let repo = (repoOverride || '').trim();
  if (!repo) {
    const catLower = (category || '').toLowerCase();
    const mealLower = (mealSection || '').toLowerCase();

    if (
      mealLower.includes('tiffin') ||
      mealLower.includes('breakfast') ||
      catLower.includes('tiffin') ||
      catLower.includes('breakfast')
    ) {
      repo = process.env.GITHUB_REPO_TIFFIN || 'SGR-Menu-Tiffin-img';
    } else if (
      mealLower.includes('lunch') ||
      mealLower.includes('meal') ||
      catLower.includes('meals') ||
      catLower.includes('lunch') ||
      catLower.includes('rice')
    ) {
      repo = process.env.GITHUB_REPO_LUNCH || 'SGR-Menu-Lunch-img';
    } else if (
      mealLower.includes('snack') ||
      catLower.includes('snack') ||
      catLower.includes('savory') ||
      catLower.includes('beverage') ||
      catLower.includes('tea') ||
      catLower.includes('coffee')
    ) {
      repo = process.env.GITHUB_REPO_SNACKS || 'SGR-Menu-Snacks-img';
    } else if (mealLower.includes('dinner') || catLower.includes('dinner')) {
      repo = process.env.GITHUB_REPO_DINNER || process.env.GITHUB_REPO || 'SGR-Menu-Dinner-img';
    } else {
      repo = process.env.GITHUB_REPO_DINNER || process.env.GITHUB_REPO || 'SGR-Menu-Tiffin-img';
    }
  }

  // 1. Prepare Base64 and Buffer
  let cleanBase64 = '';
  let fileBuffer = buffer;

  if (base64Data) {
    cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
    if (!fileBuffer) {
      fileBuffer = Buffer.from(cleanBase64, 'base64');
    }
  } else if (fileBuffer) {
    cleanBase64 = fileBuffer.toString('base64');
  }

  if (!cleanBase64 || !fileBuffer) {
    throw new Error('No valid image data or buffer provided for upload');
  }

  // 2. Generate clean, sanitized, collision-resistant filename
  let ext = 'webp';
  if (mimeType.includes('png')) ext = 'png';
  else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';

  let baseName = 'dish';
  if (dishTitle) {
    baseName = dishTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);
  } else if (filename) {
    baseName = filename
      .toLowerCase()
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 40);
  }

  const timestamp = Date.now().toString(36);
  const targetFilename = `${baseName}_${timestamp}.${ext}`;
  const cleanFolder = (folder || 'dishes').replace(/^\/+|\/+$/g, '').replace(/^public\/?/, '');
  const repoFilePath = cleanFolder ? `${cleanFolder}/${targetFilename}` : targetFilename;

  // 3. If GITHUB_TOKEN is present, commit directly to GitHub via REST API
  if (token) {
    try {
      // Check if file exists to fetch sha (in case of overwrite)
      let existingSha = null;
      try {
        const checkRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${repoFilePath}?ref=${branch}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github+json',
              'User-Agent': 'Sri-Gokulam-App',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }
        );
        if (checkRes.ok) {
          const checkJson = await checkRes.json();
          if (checkJson.sha) existingSha = checkJson.sha;
        }
      } catch (e) {
        // file doesn't exist, proceed
      }

      const commitPayload = {
        message: `Upload dish image: ${targetFilename} [skip ci]`,
        content: cleanBase64,
        branch,
        ...(existingSha ? { sha: existingSha } : {}),
      };

      let putRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${repoFilePath}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Sri-Gokulam-App',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify(commitPayload),
        }
      );

      // If branch not found on fresh/empty repository, retry without branch parameter to initialize default branch
      if (!putRes.ok && (putRes.status === 404 || putRes.status === 409)) {
        delete commitPayload.branch;
        putRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${repoFilePath}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github+json',
              'Content-Type': 'application/json',
              'User-Agent': 'Sri-Gokulam-App',
              'X-GitHub-Api-Version': '2022-11-28',
            },
            body: JSON.stringify(commitPayload),
          }
        );
      }

      const putJson = await putRes.json();
      if (!putRes.ok) {
        throw new Error(putJson.message || `GitHub API error: ${putRes.status}`);
      }

      // jsDelivr CDN URL: blazing fast, free global edge caching
      const cdnUrl = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${repoFilePath}`;
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${repoFilePath}`;

      return {
        success: true,
        provider: 'github_cdn',
        url: cdnUrl,
        cdnUrl,
        rawUrl,
        repository: repo,
        githubPath: repoFilePath,
        filename: targetFilename,
        sizeBytes: fileBuffer.length,
        sha: putJson.content?.sha || putJson.commit?.sha,
      };
    } catch (err) {
      console.error(`GitHub API Upload Error (repo: ${repo}):`, err.message);
      throw new Error(`GitHub CDN Upload failed (${repo}): ${err.message}`);
    }
  }

  // 4. Local Disk Fallback (when GITHUB_TOKEN is not configured in local dev)
  try {
    let basePublic = path.join(process.cwd(), 'public');
    if (!fs.existsSync(basePublic) && fs.existsSync(path.join(process.cwd(), 'app', 'public'))) {
      basePublic = path.join(process.cwd(), 'app', 'public');
    }
    const localPublicDir = path.join(basePublic, cleanFolder);
    if (!fs.existsSync(localPublicDir)) {
      fs.mkdirSync(localPublicDir, { recursive: true });
    }
    const localFilePath = path.join(localPublicDir, targetFilename);
    fs.writeFileSync(localFilePath, fileBuffer);

    const localUrl = `/${cleanFolder}/${targetFilename}`.replace(/\/+/g, '/');

    return {
      success: true,
      provider: 'local_disk',
      url: localUrl,
      cdnUrl: localUrl,
      rawUrl: localUrl,
      repository: 'local',
      filename: targetFilename,
      sizeBytes: fileBuffer.length,
      notice: 'Saved to local public folder. Set GITHUB_TOKEN in .env to upload directly to GitHub CDN.',
    };
  } catch (localErr) {
    throw new Error(
      `No GITHUB_TOKEN configured and local filesystem is not writable: ${localErr.message}. Please configure GITHUB_TOKEN in your environment.`
    );
  }
}

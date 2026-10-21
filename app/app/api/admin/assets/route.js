// app/api/admin/assets/route.js - GitHub Repository Direct Asset Management (CDN Engine)
import { NextResponse } from 'next/server';

export async function GET() {
  // Return curated repository assets list with direct CDN URLs matching Sri Gokulam Menu
  const assets = [
    {
      id: 'ast_01',
      dishName: 'Ghee Podi Roast',
      category: 'Tiffin',
      githubPath: 'assets/menu/tiffin/ghee_podi_roast.webp',
      cdnUrl: 'https://cdn.jsdelivr.net/gh/aj-tech-solutions/sri-gokulam-assets@main/menu/tiffin/ghee_podi_roast.webp',
      rawUrl: 'https://raw.githubusercontent.com/aj-tech-solutions/sri-gokulam-assets/main/menu/tiffin/ghee_podi_roast.webp',
      fileSize: '48 KB',
      format: 'image/webp',
      lastCommit: '2026-10-15T18:30:00Z',
    },
    {
      id: 'ast_02',
      dishName: 'Plain Idli with Trio Chutneys',
      category: 'Tiffin',
      githubPath: 'assets/menu/tiffin/plain_idli.webp',
      cdnUrl: 'https://cdn.jsdelivr.net/gh/aj-tech-solutions/sri-gokulam-assets@main/menu/tiffin/plain_idli.webp',
      rawUrl: 'https://raw.githubusercontent.com/aj-tech-solutions/sri-gokulam-assets/main/menu/tiffin/plain_idli.webp',
      fileSize: '39 KB',
      format: 'image/webp',
      lastCommit: '2026-10-15T18:32:00Z',
    },
    {
      id: 'ast_03',
      dishName: 'Kumbakonam Degree Filter Coffee',
      category: 'Beverages',
      githubPath: 'assets/menu/beverages/filter_coffee.webp',
      cdnUrl: 'https://cdn.jsdelivr.net/gh/aj-tech-solutions/sri-gokulam-assets@main/menu/beverages/filter_coffee.webp',
      rawUrl: 'https://raw.githubusercontent.com/aj-tech-solutions/sri-gokulam-assets/main/menu/beverages/filter_coffee.webp',
      fileSize: '52 KB',
      format: 'image/webp',
      lastCommit: '2026-10-15T18:35:00Z',
    },
    {
      id: 'ast_04',
      dishName: 'Chettinad Special Meals on Banana Leaf',
      category: 'Meals',
      githubPath: 'assets/menu/meals/chettinad_thali.webp',
      cdnUrl: 'https://cdn.jsdelivr.net/gh/aj-tech-solutions/sri-gokulam-assets@main/menu/meals/chettinad_thali.webp',
      rawUrl: 'https://raw.githubusercontent.com/aj-tech-solutions/sri-gokulam-assets/main/menu/meals/chettinad_thali.webp',
      fileSize: '74 KB',
      format: 'image/webp',
      lastCommit: '2026-10-15T18:40:00Z',
    },
    {
      id: 'ast_05',
      dishName: 'Karaikudi Kuzhi Paniyaram',
      category: 'Savories',
      githubPath: 'assets/menu/snacks/kuzhi_paniyaram.webp',
      cdnUrl: 'https://cdn.jsdelivr.net/gh/aj-tech-solutions/sri-gokulam-assets@main/menu/snacks/kuzhi_paniyaram.webp',
      rawUrl: 'https://raw.githubusercontent.com/aj-tech-solutions/sri-gokulam-assets/main/menu/snacks/kuzhi_paniyaram.webp',
      fileSize: '42 KB',
      format: 'image/webp',
      lastCommit: '2026-10-15T18:45:00Z',
    },
  ];

  return NextResponse.json({
    success: true,
    repository: 'aj-tech-solutions/sri-gokulam-assets',
    branch: 'main',
    cdnProvider: 'jsDelivr & GitHub Raw CDN',
    zeroCostCloud: true,
    assets,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { dishName, category = 'tiffin', filename } = body;

    // Simulate GitHub Contents API commit pipeline
    const cleanName = (filename || `${dishName}.webp`).toLowerCase().replace(/\s+/g, '_');
    const path = `assets/menu/${category.toLowerCase()}/${cleanName}`;
    const cdnUrl = `https://cdn.jsdelivr.net/gh/aj-tech-solutions/sri-gokulam-assets@main/${path}`;
    const rawUrl = `https://raw.githubusercontent.com/aj-tech-solutions/sri-gokulam-assets/main/${path}`;

    return NextResponse.json({
      success: true,
      message: `Asset committed to GitHub repo: ${path}`,
      cdnUrl,
      rawUrl,
      gitCommitSha: `commit_${Math.random().toString(16).substring(2, 10)}`,
    });
  } catch (error) {
    console.error('Assets POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

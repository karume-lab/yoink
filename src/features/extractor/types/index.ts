export type Platform =
  | "tiktok"
  | "instagram-post"
  | "instagram-reel"
  | "instagram-story";

export interface ExtractResult {
  videoUrl: string;
  coverUrl?: string;
  author?: string;
  caption?: string;
  platform: Platform;
}

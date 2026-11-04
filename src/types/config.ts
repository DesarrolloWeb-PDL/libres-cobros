import { z } from 'zod';

export const UpdateSiteConfigSchema = z.object({
  configs: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.string(),
      })
    )
    .min(1),
});

export type UpdateSiteConfigInput = z.infer<typeof UpdateSiteConfigSchema>;

export interface SiteConfigListItem {
  id: string;
  key: string;
  value: string;
  description: string;
  updatedAt: string;
  /** True when a write-only private key is configured (value is never returned). */
  keyConfigured?: boolean;
  /** True when a certificate is configured (value is masked in responses). */
  certConfigured?: boolean;
}

export interface SiteConfigTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
}

export interface SiteConfigListResponse {
  data: SiteConfigListItem[];
  theme?: SiteConfigTheme | null;
}

export interface ConfigSection {
  title: string;
  description: string;
  keys: string[];
}

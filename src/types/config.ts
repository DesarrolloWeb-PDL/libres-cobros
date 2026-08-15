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
}

export interface SiteConfigListResponse {
  data: SiteConfigListItem[];
}

export interface ConfigSection {
  title: string;
  description: string;
  keys: string[];
}

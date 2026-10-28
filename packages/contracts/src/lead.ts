import { z } from "zod";

export interface LeadMagnet {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  active: boolean;
  updatedAt: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  consent: boolean;
  sourcePage: string | null;
  leadMagnetId: string | null;
  leadMagnetTitle: string | null;
  createdAt: string;
}

export interface LeadSubmissionResponse {
  /** False when the email was already captured; the download is still returned. */
  created: boolean;
  downloadUrl: string | null;
  leadMagnet: LeadMagnet | null;
  message: string;
}

export const leadSubmissionSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(160),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address")
    .max(254),
  consent: z
    .boolean()
    .refine(value => value, {
      message: "Consent is required to receive the download",
    }),
  sourcePage: z.string().max(512).optional(),
  /** Honeypot field; a non-empty value is treated as a bot submission. */
  company: z.string().max(200).optional(),
});
export type LeadSubmissionInput = z.input<typeof leadSubmissionSchema>;

export const leadMagnetWriteSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).nullish(),
  coverUrl: z.string().max(1024).nullish(),
  fileUrl: z.string().max(1024).nullish(),
  fileName: z.string().max(260).nullish(),
  active: z.boolean().default(false),
});
export type LeadMagnetWriteInput = z.input<typeof leadMagnetWriteSchema>;

export const leadListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(50),
});

export type LeadSubmission = z.output<typeof leadSubmissionSchema>;
export type LeadMagnetWrite = z.output<typeof leadMagnetWriteSchema>;
export type LeadListQuery = z.output<typeof leadListQuerySchema>;

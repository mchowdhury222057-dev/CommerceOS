import { api } from "../lib/api-client";
import type { VerificationStatus } from "../lib/api-types";

export interface VerificationTokenView {
  storeName: string;
  ownerName: string;
  ownerEmail: string;
  status: VerificationStatus;
}

// Public, token-gated (Section 7) - no auth header required, the token in
// the URL is itself the credential.
export function getVerificationByToken(token: string): Promise<VerificationTokenView> {
  return api.get<VerificationTokenView>(`/api/verification/${token}`);
}

export interface SubmitVerificationInput {
  fullName: string;
  phone: string;
  businessType?: string;
  businessAddress?: string;
  description?: string;
  nidNumber: string;
  tradeLicenseNumber?: string;
  nidDocument: File;
  tradeLicenseDocument?: File;
  supportingDocument?: File;
}

export function submitVerification(token: string, input: SubmitVerificationInput): Promise<{ message: string }> {
  const formData = new FormData();
  formData.append("fullName", input.fullName);
  formData.append("phone", input.phone);
  if (input.businessType) formData.append("businessType", input.businessType);
  if (input.businessAddress) formData.append("businessAddress", input.businessAddress);
  if (input.description) formData.append("description", input.description);
  formData.append("nidNumber", input.nidNumber);
  if (input.tradeLicenseNumber) formData.append("tradeLicenseNumber", input.tradeLicenseNumber);
  formData.append("nidDocument", input.nidDocument);
  if (input.tradeLicenseDocument) formData.append("tradeLicenseDocument", input.tradeLicenseDocument);
  if (input.supportingDocument) formData.append("supportingDocument", input.supportingDocument);
  return api.post<{ message: string }>(`/api/verification/${token}/submit`, formData);
}

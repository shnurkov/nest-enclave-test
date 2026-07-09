export class DecryptDto {
  ciphertextBlob!: string;
  keyId?: string;
  encryptionContext?: Record<string, string>;
}

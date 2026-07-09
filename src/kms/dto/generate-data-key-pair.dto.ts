import { DataKeyPairSpec } from '@aws-sdk/client-kms';

export class GenerateDataKeyPairDto {
  keyId!: string;
  keyPairSpec?: DataKeyPairSpec;
  encryptionContext?: Record<string, string>;
}

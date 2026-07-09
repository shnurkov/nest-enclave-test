import { Injectable } from '@nestjs/common';
import {
  DecryptCommand,
  DecryptCommandInput,
  GenerateDataKeyPairCommand,
  GenerateDataKeyPairCommandInput,
  KMSClient,
} from '@aws-sdk/client-kms';

@Injectable()
export class KmsService {
  private readonly client = new KMSClient({
    region: 'eu-central-1', // process.env.AWS_REGION,
    // Enclaver injects AWS_KMS_ENDPOINT inside the enclave so requests go
    // through its KMS proxy (attestation is attached transparently there).
    // Outside the enclave the variable is unset and the SDK talks to KMS directly.
    endpoint: 'http://127.0.0.1:8000',
    // ...(process.env.AWS_KMS_ENDPOINT && {
    //   endpoint: process.env.AWS_KMS_ENDPOINT,
    // }),
  });

  generateDataKeyPair(input: GenerateDataKeyPairCommandInput) {
    return this.client.send(new GenerateDataKeyPairCommand(input));
  }

  decrypt(input: DecryptCommandInput) {
    return this.client.send(new DecryptCommand(input));
  }
}

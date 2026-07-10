import { Injectable, Logger } from '@nestjs/common';
import {
  DecryptCommand,
  DecryptCommandInput,
  GenerateDataKeyPairCommand,
  GenerateDataKeyPairCommandInput,
  KMSClient,
} from '@aws-sdk/client-kms';

@Injectable()
export class KmsService {
  private readonly logger = new Logger(KmsService.name);

  private readonly client = new KMSClient({
    region: process.env.AWS_REGION,
    // Enclaver injects AWS_KMS_ENDPOINT inside the enclave so requests go
    // through its KMS proxy (attestation is attached transparently there).
    // Outside the enclave the variable is unset and the SDK talks to KMS directly.
    ...(process.env.AWS_KMS_ENDPOINT && {
      endpoint: process.env.AWS_KMS_ENDPOINT,
      // The enclave only has a loopback interface, so it has no route to
      // IMDS and can't resolve real credentials. That's fine: the KMS proxy
      // (odyn) doesn't validate the request's signature, it strips it and
      // re-signs the request with its own real, host-derived credentials
      // before forwarding to AWS KMS (see enclaver's proxy/kms.rs). These
      // placeholders only need to be well-formed enough for the SDK to build
      // a SigV4 header.
      credentials: {
        accessKeyId: 'enclave-kms-proxy',
        secretAccessKey: 'enclave-kms-proxy',
      },
    }),
  });

  async generateDataKeyPair(input: GenerateDataKeyPairCommandInput) {
    try {
      return await this.client.send(new GenerateDataKeyPairCommand(input));
    } catch (error) {
      this.logError('generateDataKeyPair', error);
      throw error;
    }
  }

  async decrypt(input: DecryptCommandInput) {
    try {
      return await this.client.send(new DecryptCommand(input));
    } catch (error) {
      this.logError('decrypt', error);
      throw error;
    }
  }

  private logError(operation: string, error: unknown) {
    const err = error as { name?: string; message?: string; stack?: string };
    this.logger.error(
      `KMS ${operation} failed: ${err?.name ?? 'Error'}: ${err?.message ?? String(error)}`,
      err?.stack,
    );
  }
}

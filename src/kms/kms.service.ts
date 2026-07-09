import { Injectable } from '@nestjs/common';
import {
  DecryptCommand,
  DecryptCommandInput,
  GenerateDataKeyPairCommand,
  GenerateDataKeyPairCommandInput,
  KMSClient,
} from '@aws-sdk/client-kms';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

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
    // Default IMDS timeout/retries are too tight for the extra vsock hop
    // between the enclave and the host's network stack.
    credentials: fromNodeProviderChain({
      timeout: 5000,
      maxRetries: 3,
      logger: console,
    }),
    logger: console,
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
    const err = error as {
      name?: string;
      message?: string;
      $metadata?: unknown;
      stack?: string;
    };
    console.error(`KMS ${operation} failed`, {
      name: err?.name,
      message: err?.message,
      metadata: err?.$metadata,
      stack: err?.stack,
    });
  }
}

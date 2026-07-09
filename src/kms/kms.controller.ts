import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { KmsService } from './kms.service';
import { GenerateDataKeyPairDto } from './dto/generate-data-key-pair.dto';
import { DecryptDto } from './dto/decrypt.dto';

function toBase64(bytes?: Uint8Array): string | undefined {
  return bytes ? Buffer.from(bytes).toString('base64') : undefined;
}

@Controller('kms')
export class KmsController {
  constructor(private readonly kmsService: KmsService) {}

  @Post('generate-data-key-pair')
  async generateDataKeyPair(@Body() dto: GenerateDataKeyPairDto) {
    if (!dto?.keyId) {
      throw new BadRequestException('keyId is required');
    }

    const result = await this.kmsService.generateDataKeyPair({
      KeyId: dto.keyId,
      KeyPairSpec: dto.keyPairSpec ?? 'RSA_2048',
      EncryptionContext: dto.encryptionContext,
    });

    return {
      keyId: result.KeyId,
      keyPairSpec: result.KeyPairSpec,
      publicKey: toBase64(result.PublicKey),
      privateKeyCiphertextBlob: toBase64(result.PrivateKeyCiphertextBlob),
      // Returned only because this is a manual test endpoint for verifying
      // the KMS proxy round-trip — never expose plaintext key material like this in production.
      privateKeyPlaintext: toBase64(result.PrivateKeyPlaintext),
    };
  }

  @Post('decrypt')
  async decrypt(@Body() dto: DecryptDto) {
    if (!dto?.ciphertextBlob) {
      throw new BadRequestException('ciphertextBlob is required');
    }

    const result = await this.kmsService.decrypt({
      CiphertextBlob: Buffer.from(dto.ciphertextBlob, 'base64'),
      KeyId: dto.keyId,
      EncryptionContext: dto.encryptionContext,
    });

    return {
      keyId: result.KeyId,
      plaintext: toBase64(result.Plaintext),
    };
  }
}

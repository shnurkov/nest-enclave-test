# nest-enclave

NestJS-приложение для тестирования операций AWS KMS (`GenerateDataKeyPair`, `Decrypt`) из-под AWS Nitro Enclave через [Enclaver](https://github.com/edgebitio/enclaver) и его KMS proxy. Запросы к KMS выполняются официальным AWS SDK (`@aws-sdk/client-kms`).

Приложение слушает порт `4545` (см. `Dockerfile` и `enclaver.yaml`).

## Требования

- [Docker](https://docs.docker.com/get-docker/)
- [Enclaver CLI](https://github.com/edgebitio/enclaver) (`enclaver`) — используется для сборки образа энклава из обычного Docker-образа
- Для запуска и работы самого энклава (не для сборки) — инстанс EC2 с поддержкой Nitro Enclaves

## 1. Сборка Docker-образа приложения

`Dockerfile` собирает приложение в три стадии (зависимости → сборка → продакшн-рантайм на `node:20-alpine`) и на выходе даёт образ, который слушает `4545` и запускает `node dist/main.js`.

Имя образа должно совпадать со значением `sources.app` в `enclaver.yaml` — сейчас это `app-enclave:latest`:

```bash
docker build -t app-enclave:latest .
```

Проверить образ локально можно так:

```bash
docker run --rm -p 4545:4545 app-enclave:latest
```

## 2. Сборка образа энклава (Enclaver)

`enclaver.yaml` описывает, как превратить обычный Docker-образ (`sources.app`) в образ энклава (`target`):

```yaml
version: v1
name: "enclaver"
target: "enclaver:latest"
sources:
  app: "app-enclave:latest"
defaults:
  memory_mb: 1000
  cpu_count: 1
ingress:
  - listen_port: 4545
kms_proxy:
  listen_port: 8000
egress:
  allow:
    - kms.*.amazonaws.com
    - 169.254.169.254
```

- `sources.app` — исходный Docker-образ приложения (результат шага 1)
- `target` — имя итогового образа энклава, который будет создан
- `ingress.listen_port` — порт, который проксируется внутрь энклава (должен совпадать с портом в `Dockerfile`)
- `defaults.memory_mb` / `defaults.cpu_count` — ресурсы энклава по умолчанию
- `kms_proxy.listen_port` — порт, на котором Enclaver внутри энклава поднимает локальный KMS proxy. Enclaver сам прокидывает в окружение приложения `AWS_KMS_ENDPOINT=http://127.0.0.1:8000`, добавляет attestation document к запросам `Decrypt`/`GenerateDataKeyPair` и прозрачно расшифровывает ответ KMS — приложению не нужно ничего знать про attestation, достаточно обычного AWS SDK. **Этот порт не должен попадать в `ingress`**, иначе расшифровка станет доступна снаружи энклава.
- `egress.allow` — разрешает энклаву обращаться к `kms.*.amazonaws.com` (сам KMS proxy ходит наружу) и к `169.254.169.254` (IMDS, нужен SDK для получения AWS credentials/региона по умолчанию)

Собрать образ энклава (`enclaver.yaml` должен находиться в текущей директории):

```bash
enclaver build
```

Команда возьмёт образ `app-enclave:latest`, обернёт его в EIF (Enclave Image File) и создаст итоговый Docker-образ `enclaver:latest`, который уже содержит артефакт энклава.

## 3. Полная сборка одной командой

```bash
docker build -t app-enclave:latest . && enclaver build
```

## Запуск энклава

Локальный тестовый запуск (эмуляция, без реального Nitro-энклава):

```bash
enclaver run --dev enclaver:latest
```

Для запуска в реальном AWS Nitro Enclave образ `enclaver:latest` нужно задеплоить на EC2-инстанс с поддержкой Nitro Enclaves — см. документацию [Enclaver](https://github.com/edgebitio/enclaver) и [AWS Nitro Enclaves](https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave.html).

## Переменные окружения

- `AWS_REGION` — регион KMS.
- `AWS_KMS_ENDPOINT` — не задаётся вручную, Enclaver прокидывает её сам внутри энклава (см. `kms_proxy` выше). Вне энклава переменная не установлена, и SDK ходит в KMS напрямую по обычной credential chain — удобно для локальной отладки без Enclaver.

## Тестовые эндпоинты

Модуль `src/kms` — тестовый стенд с двумя ручками, по одной на каждую KMS-операцию:

**`POST /kms/generate-data-key-pair`**

```bash
curl -X POST localhost:4545/kms/generate-data-key-pair \
  -H 'content-type: application/json' \
  -d '{"keyId": "alias/my-key", "keyPairSpec": "RSA_2048"}'
```

Возвращает `{ keyId, keyPairSpec, publicKey, privateKeyCiphertextBlob, privateKeyPlaintext }` (все бинарные поля — base64). `privateKeyPlaintext` возвращается только для проверки самого прохождения запроса через KMS proxy — так делать в production-коде нельзя.

**`POST /kms/decrypt`**

```bash
curl -X POST localhost:4545/kms/decrypt \
  -H 'content-type: application/json' \
  -d '{"ciphertextBlob": "<base64 ciphertext>"}'
```

Возвращает `{ keyId, plaintext }` (`plaintext` — base64).

Для реального запуска внутри энклава key policy соответствующего KMS-ключа должна разрешать вызов из-под enclave attestation (обычно через условия `kms:RecipientAttestation:*`) — это настраивается на стороне AWS-аккаунта, вне кода приложения.

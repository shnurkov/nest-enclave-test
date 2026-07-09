# nest-enclave

Минимальное NestJS-приложение, упакованное для запуска внутри AWS Nitro Enclave с помощью [Enclaver](https://github.com/edgebitio/enclaver).

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
```

- `sources.app` — исходный Docker-образ приложения (результат шага 1)
- `target` — имя итогового образа энклава, который будет создан
- `ingress.listen_port` — порт, который проксируется внутрь энклава (должен совпадать с портом в `Dockerfile`)
- `defaults.memory_mb` / `defaults.cpu_count` — ресурсы энклава по умолчанию

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

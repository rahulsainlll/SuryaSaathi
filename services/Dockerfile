# One image per Python service for AWS Lambda (arm64). infra/ builds it with the service
# name, e.g. `docker build -f services/Dockerfile --build-arg SERVICE=agents .` from the
# repository root, and sets the handler (CMD) per function.
FROM public.ecr.aws/lambda/python:3.12

COPY --from=ghcr.io/astral-sh/uv:0.9.18 /uv /usr/local/bin/uv

ARG SERVICE
WORKDIR /build
COPY pyproject.toml uv.lock ./
COPY services ./services
COPY tools/device-sim ./tools/device-sim

# Install exactly the locked third-party dependencies of this service, then copy in its
# source and the shared core package (workspace packages are plain source trees).
RUN uv export --frozen --no-dev --no-emit-workspace --no-hashes --no-header \
        --package "suryasaathi-${SERVICE}" -o requirements.txt \
 && uv pip install --no-cache --python /var/lang/bin/python3.12 \
        --target "${LAMBDA_TASK_ROOT}" -r requirements.txt \
 && cp -r services/core/src/suryasaathi_core \
        "services/${SERVICE}/src/suryasaathi_$(echo "${SERVICE}" | tr - _)" \
        "${LAMBDA_TASK_ROOT}/" \
 && rm -rf /build

# Shared JSON schemas and golden fixtures (packages/schemas).
COPY packages/schemas/schemas /opt/suryasaathi-schemas/schemas
COPY packages/schemas/fixtures /opt/suryasaathi-schemas/fixtures
ENV SURYASAATHI_SCHEMAS_DIR=/opt/suryasaathi-schemas

WORKDIR ${LAMBDA_TASK_ROOT}
CMD ["suryasaathi_core.config.Settings"]

FROM node:22-alpine AS build-deps
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies without running prepare scripts
RUN echo "Iniciando install..." && \
    npm ci --ignore-scripts && \
    echo "Install concluído."

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./
COPY tsconfig.app.json ./
COPY tsconfig.node.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY components.json ./
COPY public/ ./public/

# Modo demo: "true" embute o mock da API no bundle, para rodar o manager sem
# backend. Precisa ser decidido aqui, no build, porque o Vite substitui
# import.meta.env em tempo de compilação — um build sem este argumento não tem
# como virar demo depois.
ARG VITE_DEMO_MODE=false
ENV VITE_DEMO_MODE=${VITE_DEMO_MODE}

# Build the application
RUN echo "Iniciando build (VITE_DEMO_MODE=${VITE_DEMO_MODE})..." && \
    npm run build && \
    echo "Build concluído."

FROM nginx:alpine

ENV PUBLIC_HTML=/usr/share/nginx/html

RUN rm /etc/nginx/conf.d/default.conf

COPY .docker/nginx.conf /etc/nginx/conf.d/

COPY .docker/start.sh /

COPY --from=build-deps /usr/src/app/dist ${PUBLIC_HTML}

EXPOSE 80

ENTRYPOINT [ "/bin/sh", "/start.sh" ]

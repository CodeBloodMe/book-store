FROM node:20-alpine
WORKDIR /app

# Install OpenSSL and libc6-compat for Prisma on Alpine
RUN apk add --no-cache openssl libc6-compat

# Copy package manifests and Prisma schema for postinstall hook
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy remaining source files
COPY . .

# Build application with placeholder env vars to pass static rendering
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_key
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

EXPOSE 3000
CMD [npm, start]

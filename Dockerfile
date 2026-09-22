# ==========================================
# STAGE 1: Build Frontend (Next.js / React)
# ==========================================
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ==========================================
# STAGE 2: Build Backend (Spring Boot JAR)
# ==========================================
FROM maven:3.9-eclipse-temurin-17 AS backend-builder
WORKDIR /app/backend

COPY backend/pom.xml .
RUN mvn dependency:go-offline -B

COPY backend/src ./src
RUN mvn package -DskipTests

# ==========================================
# STAGE 3: Final Production Runtime Image
# ==========================================
FROM eclipse-temurin:17-jre-alpine AS runner
WORKDIR /app

# Environmental defaults (overridden at runtime)
ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=prod

# Copy compiled backend JAR from Stage 2
COPY --from=backend-builder /app/backend/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
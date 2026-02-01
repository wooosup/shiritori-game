FROM gradle:jdk21 AS builder
WORKDIR /app
COPY . .
RUN chmod +x ./gradlew

FROM eclipse-temurin:21-jdk
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]


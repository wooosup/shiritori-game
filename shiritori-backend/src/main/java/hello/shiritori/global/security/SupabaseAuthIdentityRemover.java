package hello.shiritori.global.security;

import hello.shiritori.domain.profile.port.AuthIdentityRemover;
import hello.shiritori.global.exception.AuthProviderException;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Slf4j
@Component
public class SupabaseAuthIdentityRemover implements AuthIdentityRemover {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(8);

    private final HttpClient httpClient;
    private final String projectUrl;
    private final String serviceRoleKey;

    public SupabaseAuthIdentityRemover(
            @Value("${supabase.project-url:}") String projectUrl,
            @Value("${supabase.service-role-key:}") String serviceRoleKey
    ) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .build();
        this.projectUrl = trimTrailingSlash(projectUrl);
        this.serviceRoleKey = serviceRoleKey == null ? "" : serviceRoleKey.trim();
    }

    @Override
    public void deleteIdentity(UUID userId) {
        validateConfig();
        String endpoint = projectUrl + "/auth/v1/admin/users/" + userId;

        HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + serviceRoleKey)
                .header("apikey", serviceRoleKey)
                .DELETE()
                .build();

        try {
            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            int status = response.statusCode();

            if (status == 200 || status == 204 || status == 404) {
                return;
            }

            log.error("Supabase auth delete failed. status={}, userId={}", status, userId);
            throw AuthProviderException.deleteFailed();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Supabase auth delete interrupted. userId={}", userId, e);
            throw AuthProviderException.deleteFailed();
        } catch (IOException e) {
            log.error("Supabase auth delete IO error. userId={}", userId, e);
            throw AuthProviderException.deleteFailed();
        }
    }

    private void validateConfig() {
        if (!StringUtils.hasText(projectUrl) || !StringUtils.hasText(serviceRoleKey)) {
            throw AuthProviderException.misconfigured();
        }
    }

    private String trimTrailingSlash(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}


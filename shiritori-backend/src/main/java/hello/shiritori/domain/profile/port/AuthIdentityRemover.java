package hello.shiritori.domain.profile.port;

import java.util.UUID;

public interface AuthIdentityRemover {

    void deleteIdentity(UUID userId);
}


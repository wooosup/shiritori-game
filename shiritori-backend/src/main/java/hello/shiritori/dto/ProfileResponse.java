package hello.shiritori.dto;

import hello.shiritori.entity.Profile;
import lombok.Builder;
import lombok.Getter;

@Getter
public class ProfileResponse {

    private final String nickname;
    private final String avatarUrl;

    @Builder
    private ProfileResponse(Profile profile) {
        this.nickname = profile.getNickname();
        this.avatarUrl = profile.getAvatarUrl();
    }

    public static ProfileResponse of(Profile profile) {
        return ProfileResponse.builder()
                .profile(profile)
                .build();
    }

}

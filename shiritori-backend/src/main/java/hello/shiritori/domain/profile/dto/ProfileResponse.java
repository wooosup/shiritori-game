package hello.shiritori.domain.profile.dto;

import hello.shiritori.domain.profile.entity.Profile;
import lombok.Builder;
import lombok.Getter;

@Getter
public class ProfileResponse {

    private final String nickname;

    @Builder
    private ProfileResponse(String nickname) {
        this.nickname = nickname;
    }

    public static ProfileResponse of(Profile profile) {
        return ProfileResponse.builder()
                .nickname(profile.getNickname())
                .build();
    }

}
